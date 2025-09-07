/**
 * Universal Barcode Scanner Handler
 * Handles mobile keyboard prevention and terminal vs keyboard input detection
 */

class BarcodeScanner {
  constructor() {
    this.isScanning = false;
    this.scanTimeout = null;
    this.lastInputTime = 0;
    this.scanSpeedThreshold = 200; // ms - faster than this indicates scanner
    this.minScanLength = 6;
    this.maxScanLength = 50;
  }

  /**
   * Initialize barcode input field with mobile-friendly settings
   * @param {string|HTMLElement} selector - Input field selector or element
   * @param {Object} options - Configuration options
   */
  initializeBarcodeInput(selector, options = {}) {
    const input = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!input) {
      console.warn('Barcode input not found:', selector);
      return null;
    }

    // Default options
    const config = {
      readonly: true, // Prevent mobile keyboard by default
      autocomplete: 'off',
      preventManualInput: false,
      onScan: null,
      onError: null,
      minLength: 6,
      maxLength: 50,
      placeholder: 'Barkod okutun...',
      enableManualMode: false, // Allow double-tap to enable manual input
      ...options
    };

    // Apply mobile-friendly attributes
    input.setAttribute('readonly', config.readonly);
    input.setAttribute('autocomplete', config.autocomplete);
    input.setAttribute('inputmode', 'none'); // Prevent mobile keyboard
    input.style.cursor = 'pointer';
    
    if (config.placeholder) {
      input.setAttribute('placeholder', config.placeholder);
    }

    // Create wrapper for better UX
    if (!input.parentElement.classList.contains('barcode-scanner-wrapper')) {
      this.wrapInput(input, config);
    }

    // Add event listeners
    this.setupEventListeners(input, config);

    return {
      input,
      config,
      enableManualInput: () => this.enableManualInput(input),
      disableManualInput: () => this.disableManualInput(input),
      clear: () => this.clearInput(input),
      focus: () => this.focusInput(input)
    };
  }

  /**
   * Wrap input with scanner UI elements
   */
  wrapInput(input, config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'barcode-scanner-wrapper';
    
    const statusIcon = document.createElement('div');
    statusIcon.className = 'scanner-status-icon';
    statusIcon.innerHTML = '📱';
    
    const statusText = document.createElement('div');
    statusText.className = 'scanner-status-text';
    statusText.textContent = 'Barkod okutmaya hazır';

    // Manual input toggle (if enabled)
    if (config.enableManualMode) {
      const manualToggle = document.createElement('button');
      manualToggle.type = 'button';
      manualToggle.className = 'manual-input-toggle';
      manualToggle.innerHTML = '⌨️';
      manualToggle.title = 'Manuel giriş modunu aç/kapat';
      manualToggle.addEventListener('click', () => {
        this.toggleManualMode(input);
      });
      wrapper.appendChild(manualToggle);
    }

    input.parentElement.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(statusIcon);
    wrapper.appendChild(statusText);
  }

  /**
   * Setup event listeners for barcode input
   */
  setupEventListeners(input, config) {
    let inputStartTime = 0;
    let scanBuffer = '';

    // Focus event - show scanning status
    input.addEventListener('focus', () => {
      this.updateScannerStatus(input, 'scanning', '📱 Barkod bekleniyor...');
    });

    // Blur event - reset status
    input.addEventListener('blur', () => {
      if (input.value.length === 0) {
        this.updateScannerStatus(input, 'ready', 'Barkod okutmaya hazır');
      }
    });

    // Input event - detect scanner vs manual typing
    input.addEventListener('input', (e) => {
      const currentTime = Date.now();
      const value = e.target.value;

      // Clear previous timeout
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      // Track input timing
      if (scanBuffer.length === 0) {
        inputStartTime = currentTime;
      }
      
      scanBuffer = value;

      // Set timeout for processing
      this.scanTimeout = setTimeout(() => {
        this.processBarcodeInput(input, scanBuffer, currentTime - inputStartTime, config);
        scanBuffer = '';
      }, 100);
    });

    // Keydown event - handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim().length > 0) {
        e.preventDefault();
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout);
        }
        this.processBarcodeInput(input, input.value, Date.now() - inputStartTime, config);
      }
    });

    // Click event - enable manual mode if configured
    if (config.enableManualMode) {
      let clickCount = 0;
      input.addEventListener('click', () => {
        clickCount++;
        setTimeout(() => {
          if (clickCount === 2) {
            this.toggleManualMode(input);
          }
          clickCount = 0;
        }, 300);
      });
    }
  }

  /**
   * Process barcode input and determine if it's from scanner or manual
   */
  async processBarcodeInput(input, value, inputDuration, config) {
    const cleanValue = value.replace(/[\n\r]/g, '').trim();
    
    if (cleanValue.length < config.minLength || cleanValue.length > config.maxLength) {
      this.showError(input, `Barkod uzunluğu ${config.minLength}-${config.maxLength} karakter olmalı`);
      return;
    }

    // Determine input method
    const isFromScanner = this.detectScannerInput(cleanValue, inputDuration);
    
    this.updateScannerStatus(input, 'processing', '⚡ İşleniyor...');
    
    console.log(isFromScanner ? '📱 Terminal tarama algılandı' : '⌨️ Manuel giriş algılandı');

    try {
      if (config.onScan) {
        await config.onScan(cleanValue, isFromScanner, input);
      }
      
      this.updateScannerStatus(input, 'success', '✅ Başarılı');
      
      // Auto-clear after success
      setTimeout(() => {
        this.clearInput(input);
        this.updateScannerStatus(input, 'ready', 'Barkod okutmaya hazır');
      }, 1500);
      
    } catch (error) {
      const errorMsg = error.message || 'Barkod işlenirken hata oluştu';
      this.showError(input, errorMsg);
      
      if (config.onError) {
        config.onError(error, cleanValue, input);
      }
    }
  }

  /**
   * Detect if input is from barcode scanner or manual typing
   */
  detectScannerInput(value, inputDuration) {
    // Scanner detection criteria:
    // 1. Fast input speed (under threshold)
    // 2. Typical barcode patterns
    // 3. Length within scanner ranges
    
    const isFastInput = inputDuration < this.scanSpeedThreshold;
    const hasTypicalLength = value.length >= 8 && value.length <= 30;
    const hasNumericPattern = /^\d+$/.test(value) && value.length >= 8;
    const hasAlphaNumeric = /^[A-Z0-9\-]+$/.test(value.toUpperCase());
    
    return isFastInput && (hasTypicalLength || hasNumericPattern || hasAlphaNumeric);
  }

  /**
   * Enable manual input mode
   */
  enableManualInput(input) {
    input.removeAttribute('readonly');
    input.removeAttribute('inputmode');
    input.style.cursor = 'text';
    this.updateScannerStatus(input, 'manual', '⌨️ Manuel giriş modu');
    input.focus();
  }

  /**
   * Disable manual input mode
   */
  disableManualInput(input) {
    input.setAttribute('readonly', true);
    input.setAttribute('inputmode', 'none');
    input.style.cursor = 'pointer';
    this.updateScannerStatus(input, 'ready', 'Barkod okutmaya hazır');
  }

  /**
   * Toggle manual input mode
   */
  toggleManualMode(input) {
    if (input.hasAttribute('readonly')) {
      this.enableManualInput(input);
    } else {
      this.disableManualInput(input);
    }
  }

  /**
   * Update scanner status display
   */
  updateScannerStatus(input, status, message) {
    const wrapper = input.closest('.barcode-scanner-wrapper');
    if (!wrapper) return;

    const statusIcon = wrapper.querySelector('.scanner-status-icon');
    const statusText = wrapper.querySelector('.scanner-status-text');
    
    if (statusIcon && statusText) {
      statusText.textContent = message;
      
      const icons = {
        ready: '📱',
        scanning: '🔍',
        processing: '⚡',
        success: '✅',
        error: '❌',
        manual: '⌨️'
      };
      
      statusIcon.innerHTML = icons[status] || '📱';
      
      // Add status class for styling
      wrapper.className = `barcode-scanner-wrapper status-${status}`;
    }
  }

  /**
   * Show error message
   */
  showError(input, message) {
    this.updateScannerStatus(input, 'error', `❌ ${message}`);
    
    // Clear error after delay
    setTimeout(() => {
      this.clearInput(input);
      this.updateScannerStatus(input, 'ready', 'Barkod okutmaya hazır');
    }, 3000);
  }

  /**
   * Clear input value
   */
  clearInput(input) {
    input.value = '';
    input.dispatchEvent(new Event('input'));
  }

  /**
   * Focus input (mobile-friendly)
   */
  focusInput(input) {
    // On mobile, we don't want to trigger keyboard
    if (input.hasAttribute('readonly')) {
      input.focus({ preventScroll: true });
    } else {
      input.focus();
    }
  }

  /**
   * Validate barcode format
   */
  validateBarcode(barcode, type = 'any') {
    const patterns = {
      ean13: /^\d{13}$/,
      ean8: /^\d{8}$/,
      upc: /^\d{12}$/,
      code128: /^[A-Z0-9\-\s]{6,30}$/,
      any: /^[A-Z0-9\-\s]{6,50}$/i
    };

    return patterns[type] ? patterns[type].test(barcode) : patterns.any.test(barcode);
  }
}

// Create global instance
window.BarcodeScanner = new BarcodeScanner();

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
.barcode-scanner-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  transition: all 0.3s ease;
}

.barcode-scanner-wrapper.status-ready {
  border-color: #6b7280;
}

.barcode-scanner-wrapper.status-scanning {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.barcode-scanner-wrapper.status-processing {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.barcode-scanner-wrapper.status-success {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.barcode-scanner-wrapper.status-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.barcode-scanner-wrapper.status-manual {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.barcode-scanner-wrapper input {
  border: none;
  outline: none;
  padding: 16px;
  font-size: 18px;
  text-align: center;
  background: transparent;
  font-family: 'Courier New', monospace;
}

.barcode-scanner-wrapper input:focus {
  outline: none;
}

.scanner-status-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 16px;
  z-index: 1;
}

.scanner-status-text {
  padding: 8px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.manual-input-toggle {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  z-index: 2;
  transition: all 0.2s ease;
}

.manual-input-toggle:hover {
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .barcode-scanner-wrapper input {
    font-size: 16px; /* Prevent zoom on iOS */
    padding: 14px;
  }
}
`;

document.head.appendChild(style);