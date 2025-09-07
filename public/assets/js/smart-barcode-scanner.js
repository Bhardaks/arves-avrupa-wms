/**
 * Smart Barcode Scanner System
 * Handles mobile keyboard prevention and intelligent scanner vs manual input detection
 * Integrates with all barcode input fields across the WMS project
 */

class SmartBarcodeScanner {
  constructor() {
    this.scanners = new Map(); // Track all scanner instances
    this.globalConfig = {
      minScannerLength: 8,
      scannerSpeedThreshold: 500, // ms
      manualTimeoutShort: 300,   // ms for longer codes
      manualTimeoutLong: 800,    // ms for shorter codes
      preventMobileKeyboard: true
    };
  }

  /**
   * Initialize smart barcode input field
   */
  initializeInput(selector, options = {}) {
    const input = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!input) {
      console.warn('Smart barcode input not found:', selector);
      return null;
    }

    const config = {
      placeholder: 'Barkod okutun...',
      preventMobileKeyboard: true,
      enableManualMode: false,
      onScan: null,
      onError: null,
      minLength: 3,
      maxLength: 100,
      debug: false,
      ...options
    };

    // Apply mobile-friendly attributes to prevent keyboard
    if (config.preventMobileKeyboard) {
      input.setAttribute('readonly', true);
      input.setAttribute('inputmode', 'none');
      input.setAttribute('autocomplete', 'off');
      input.style.cursor = 'pointer';
    }

    if (config.placeholder) {
      input.setAttribute('placeholder', config.placeholder);
    }

    // Create scanner instance
    const scanner = {
      input,
      config,
      timeout: null,
      inputStartTime: 0,
      isManualMode: false
    };

    // Setup event listeners
    this.setupInputListeners(scanner);
    
    // Add manual mode toggle if enabled
    if (config.enableManualMode) {
      this.addManualModeToggle(scanner);
    }

    // Store scanner instance
    this.scanners.set(input, scanner);

    return {
      input,
      config,
      enableManualMode: () => this.enableManualMode(scanner),
      disableManualMode: () => this.disableManualMode(scanner),
      clear: () => this.clearInput(scanner),
      focus: () => this.focusInput(scanner)
    };
  }

  /**
   * Setup event listeners for smart input detection
   */
  setupInputListeners(scanner) {
    const { input, config } = scanner;

    // Input event - smart detection
    input.addEventListener('input', async (e) => {
      await this.handleInputEvent(scanner, e);
    });

    // Focus event
    input.addEventListener('focus', () => {
      if (config.debug) console.log('📱 Barcode input focused');
    });

    // Keydown event - handle Enter and manual mode
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim().length > 0) {
        e.preventDefault();
        clearTimeout(scanner.timeout);
        this.processInput(scanner, input.value.trim());
      }
      
      // Double ESC to enable manual mode
      if (e.key === 'Escape' && config.enableManualMode) {
        this.toggleManualMode(scanner);
      }
    });

    // Click event - double-click for manual mode
    if (config.enableManualMode) {
      let clickCount = 0;
      input.addEventListener('click', () => {
        clickCount++;
        setTimeout(() => {
          if (clickCount === 2 && !scanner.isManualMode) {
            this.enableManualMode(scanner);
          }
          clickCount = 0;
        }, 300);
      });
    }
  }

  /**
   * Handle input event with smart scanner detection
   */
  async handleInputEvent(scanner, event) {
    const { input, config } = scanner;
    const currentTime = Date.now();
    const barcode = input.value.trim();

    // Track input timing for scanner detection
    if (barcode.length === 1) {
      scanner.inputStartTime = currentTime;
    }

    // Filter out corrupted input
    if (this.isCorruptedInput(barcode)) {
      if (config.debug) console.log('🚫 Corrupted input detected, clearing');
      input.value = '';
      return;
    }

    if (config.debug) console.log('📝 Input event:', JSON.stringify(barcode));

    // Clear previous timeout
    clearTimeout(scanner.timeout);

    if (barcode.length === 0) {
      return; // Empty input
    }

    // Length validation
    if (barcode.length < config.minLength || barcode.length > config.maxLength) {
      if (barcode.length >= config.maxLength && config.onError) {
        config.onError(new Error(`Barkod çok uzun (max ${config.maxLength} karakter)`), barcode, input);
      }
      return;
    }

    // Detect input method (scanner vs manual)
    const inputDuration = currentTime - scanner.inputStartTime;
    const isFromScanner = this.detectScannerInput(barcode, inputDuration, scanner.isManualMode);

    if (isFromScanner && !scanner.isManualMode) {
      // Scanner input - process immediately
      if (config.debug) console.log('🤖 Terminal scanner detected - processing immediately');
      await this.processInput(scanner, barcode);
    } else {
      // Manual input or manual mode - wait for user to finish
      const timeout = this.calculateTimeout(barcode);
      if (config.debug) console.log('👤 Manual input detected - waiting', timeout, 'ms');

      scanner.timeout = setTimeout(async () => {
        if (input.value.trim() === barcode) {
          await this.processInput(scanner, barcode);
        }
      }, timeout);
    }
  }

  /**
   * Detect if input is from scanner or manual typing
   */
  detectScannerInput(barcode, inputDuration, isManualMode) {
    if (isManualMode) return false;
    
    const isFastInput = inputDuration < this.globalConfig.scannerSpeedThreshold;
    const hasMinLength = barcode.length >= this.globalConfig.minScannerLength;
    const hasTypicalPattern = /^[A-Z0-9\-\s]{6,}$/i.test(barcode);
    
    return isFastInput && hasMinLength && hasTypicalPattern;
  }

  /**
   * Calculate appropriate timeout based on input length
   */
  calculateTimeout(barcode) {
    return barcode.length >= this.globalConfig.minScannerLength 
      ? this.globalConfig.manualTimeoutShort 
      : this.globalConfig.manualTimeoutLong;
  }

  /**
   * Check if input is corrupted
   */
  isCorruptedInput(barcode) {
    const corruptionPatterns = [
      'Global input event',
      'inventory-count.html',
      'shelf-scanner.html',
      'package-opening.html',
      /^function\s*\(/,
      /^<[^>]*>/,
      /^var\s+/
    ];

    return corruptionPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return barcode.includes(pattern);
      }
      return pattern.test(barcode);
    });
  }

  /**
   * Process barcode input
   */
  async processInput(scanner, barcode) {
    const { config, input } = scanner;
    
    try {
      if (config.onScan) {
        const isFromScanner = !scanner.isManualMode;
        await config.onScan(barcode, isFromScanner, input);
      }
      
      // Auto-clear input after successful processing
      setTimeout(() => {
        this.clearInput(scanner);
      }, 100);

    } catch (error) {
      console.error('Smart barcode scanner error:', error);
      
      if (config.onError) {
        config.onError(error, barcode, input);
      } else {
        // Default error handling
        this.showInputError(input, error.message || 'Barkod işlenirken hata oluştu');
      }
    }
  }

  /**
   * Enable manual input mode
   */
  enableManualMode(scanner) {
    const { input, config } = scanner;
    
    scanner.isManualMode = true;
    input.removeAttribute('readonly');
    input.removeAttribute('inputmode');
    input.style.cursor = 'text';
    input.style.backgroundColor = '#fff3cd';
    input.style.borderColor = '#ffc107';
    input.setAttribute('placeholder', config.placeholder.replace('okutun', 'yazın') + ' (Manuel Mod)');
    
    input.focus();
    
    if (config.debug) console.log('⌨️ Manuel giriş modu aktif');
  }

  /**
   * Disable manual input mode
   */
  disableManualMode(scanner) {
    const { input, config } = scanner;
    
    scanner.isManualMode = false;
    
    if (config.preventMobileKeyboard) {
      input.setAttribute('readonly', true);
      input.setAttribute('inputmode', 'none');
    }
    
    input.style.cursor = 'pointer';
    input.style.backgroundColor = '';
    input.style.borderColor = '';
    input.setAttribute('placeholder', config.placeholder);
    
    if (config.debug) console.log('📱 Scanner modu aktif');
  }

  /**
   * Toggle manual mode
   */
  toggleManualMode(scanner) {
    if (scanner.isManualMode) {
      this.disableManualMode(scanner);
    } else {
      this.enableManualMode(scanner);
    }
  }

  /**
   * Add manual mode toggle button
   */
  addManualModeToggle(scanner) {
    const { input } = scanner;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = '⌨️';
    toggleBtn.title = 'Manuel giriş modunu aç/kapat (Çift tık veya ESC)';
    toggleBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      width: 32px;
      height: 32px;
      font-size: 14px;
      cursor: pointer;
      z-index: 10;
      transition: all 0.2s ease;
    `;
    
    toggleBtn.addEventListener('click', () => {
      this.toggleManualMode(scanner);
    });

    // Wrap input
    input.parentElement.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(toggleBtn);
  }

  /**
   * Clear input value
   */
  clearInput(scanner) {
    scanner.input.value = '';
  }

  /**
   * Focus input
   */
  focusInput(scanner) {
    if (scanner.isManualMode) {
      scanner.input.focus();
    } else {
      scanner.input.focus({ preventScroll: true });
    }
  }

  /**
   * Show input error
   */
  showInputError(input, message) {
    const errorClass = 'smart-barcode-error';
    input.classList.add(errorClass);
    input.style.borderColor = '#dc3545';
    
    // Create or update error message
    let errorElement = input.parentElement.querySelector('.smart-barcode-error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'smart-barcode-error-message';
      errorElement.style.cssText = `
        color: #dc3545;
        font-size: 12px;
        margin-top: 4px;
        animation: fadeIn 0.3s ease;
      `;
      input.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;

    // Clear error after delay
    setTimeout(() => {
      input.classList.remove(errorClass);
      input.style.borderColor = '';
      if (errorElement) {
        errorElement.remove();
      }
    }, 3000);
  }

  /**
   * Get scanner instance for input
   */
  getScanner(input) {
    return this.scanners.get(input);
  }

  /**
   * Remove scanner instance
   */
  removeScanner(input) {
    const scanner = this.scanners.get(input);
    if (scanner) {
      clearTimeout(scanner.timeout);
      this.scanners.delete(input);
    }
  }
}

// Create global instance
window.SmartBarcodeScanner = new SmartBarcodeScanner();

// Add required CSS
const style = document.createElement('style');
style.textContent = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.smart-barcode-error {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
`;

document.head.appendChild(style);