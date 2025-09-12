// Products Barcode - Barcode Generation and Management
(function() {
    'use strict';

    // Barcode templates
    const BARCODE_TEMPLATES = {
        simple: {
            name: 'Basit Etiket',
            width: '4cm',
            height: '2cm',
            showName: true,
            showPrice: false,
            showSku: true,
            fontSize: '8pt'
        },
        detailed: {
            name: 'Detaylı Etiket',
            width: '6cm',
            height: '3cm',
            showName: true,
            showPrice: true,
            showSku: true,
            showDescription: true,
            fontSize: '9pt'
        },
        price: {
            name: 'Fiyat Etiketi',
            width: '5cm',
            height: '4cm',
            showName: true,
            showPrice: true,
            showSku: false,
            showDescription: false,
            fontSize: '12pt',
            priceSize: '16pt'
        },
        package_zebra_zd220: {
            name: 'Zebra ZD220 Etiketi (19.8x9.8cm)',
            width: '19.8cm',
            height: '9.8cm',
            showName: true,
            showPrice: false,
            showSku: true,
            showBarcode: true,
            showDimensions: true,
            showContent: true,
            showLogo: true,
            fontSize: '11pt',
            headerSize: '14pt',
            dpi: 300,
            zebraOptimized: true
        },
        package_15x10: {
            name: 'Paket Etiketi (15x10cm)',
            width: '15cm',
            height: '10cm',
            showName: true,
            showPrice: false,
            showSku: true,
            showBarcode: true,
            showDimensions: true,
            showContent: true,
            showLogo: true,
            fontSize: '10pt',
            headerSize: '12pt'
        },
        package_10x15: {
            name: 'Paket Etiketi (10x15cm)',
            width: '10cm',
            height: '15cm',
            showName: true,
            showPrice: false,
            showSku: true,
            showBarcode: true,
            showDimensions: true,
            showContent: true,
            showLogo: true,
            fontSize: '10pt',
            headerSize: '12pt'
        }
    };

    // Open barcode operations for specific product
    window.openBarcodeOperations = function(productId) {
        const product = window.products.find(p => p.id === productId);
        if (!product) {
            showMessage('Ürün bulunamadı', 'error');
            return;
        }

        const modal = document.getElementById('barcodeModal');
        const content = document.getElementById('barcodeModalContent');
        
        if (!modal || !content) return;

        // Update modal title to show product name
        const modalTitle = modal.querySelector('.modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = `${product.name} - Barkod İşlemleri`;
        }

        modal.style.display = 'flex';
        renderBarcodeOperations(product);
    };

    // Open barcode modal (general)
    window.openBarcodeModal = function() {
        const modal = document.getElementById('barcodeModal');
        const content = document.getElementById('barcodeModalContent');
        
        if (!modal || !content) return;

        // Reset modal title
        const modalTitle = modal.querySelector('.modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = 'Barkod İşlemleri';
        }

        modal.style.display = 'flex';
        renderBarcodeModal();
    };

    // Close barcode modal
    window.closeBarcodeModal = function() {
        const modal = document.getElementById('barcodeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    // Render barcode modal content
    function renderBarcodeModal() {
        const content = document.getElementById('barcodeModalContent');
        if (!content) return;

        const selectedCount = window.selectedProducts?.length || 0;

        const html = `
            <div class="barcode-modal-content">
                <!-- Selection Info -->
                <div class="selection-info">
                    <div class="info-card">
                        <h4>Barkod İşlemleri</h4>
                        <p>${selectedCount} ürün seçili</p>
                        ${selectedCount === 0 ? '<p class="warning">⚠️ Lütfen önce ürün seçiniz</p>' : ''}
                    </div>
                </div>

                <!-- Simple Operations -->
                <div class="simple-operations">
                    <button onclick="printBarcodes()" class="btn btn-primary btn-large" ${selectedCount === 0 ? 'disabled' : ''}>
                        🖨️ Basit Barkod Yazdır (${selectedCount} adet)
                    </button>
                    <p class="operation-hint">Seçili ürünler için basit barkod etiketleri yazdırır</p>
                </div>

                <!-- Actions -->
                <div class="actions-section">
                    <button onclick="closeBarcodeModal()" class="btn btn-outline">
                        ❌ Kapat
                    </button>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }

    // Render barcode operations for specific product
    function renderBarcodeOperations(product) {
        const content = document.getElementById('barcodeModalContent');
        if (!content) return;

        // Start loading packages immediately
        loadProductPackagesAsync(product.id).then(packages => {
            // Paket verilerini kullanarak etiket alanlarını ayarlayalım
            packages.forEach(pkg => {
                // Etiket template'inde:
                // Ana ürün adı (üstte, büyük): pkg.product_name (Paket formundaki "Ürün Adı *" alanı)
                // Paket detay bilgisi (altta, küçük): pkg.package_name (Paket formundaki "Paket Adı *" alanı)
                
                // Bu veriler backend'den geliyor, sadece fallback değerleri ekleyelim
                if (!pkg.product_name) pkg.product_name = product.name; // fallback - ana ürün adından
                if (!pkg.package_name) pkg.package_name = 'Paket'; // fallback - varsayılan değer
                
                // Ana ürün bilgilerini de ekleyelim (ihtiyaç halinde)
                pkg.main_product_name = product.main_product_name;
                pkg.main_product_name_en = product.main_product_name_en;
                
                console.log(`📦 Package data for barcode: product_name="${pkg.product_name}", product_name_en="${pkg.product_name_en}", package_name="${pkg.package_name}", package_name_en="${pkg.package_name_en}"`);
            });
            renderBarcodeOperationsWithPackages(product, packages);
        }).catch(error => {
            console.error('Error loading packages:', error);
            renderBarcodeOperationsWithPackages(product, []);
        });

        // Render initial content with loading state
        const html = `
            <div class="barcode-operations-content">
                <!-- Product Info -->
                <div class="product-info-section">
                    <div class="product-info-card">
                        <div class="product-details">
                            <h4>${escapeHtml(product.name)}</h4>
                            <div class="product-meta">
                                <span class="product-sku">SKU: <strong>${escapeHtml(product.sku)}</strong></span>
                                ${product.main_barcode ? `<span class="product-barcode">Ana Barkod: <strong>${escapeHtml(product.main_barcode)}</strong></span>` : ''}
                            </div>
                            ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Loading State -->
                <div id="packagesLoadingSection">
                    <div class="loading-message">Alt paketler yükleniyor...</div>
                </div>

                <!-- Packages will be rendered here -->
                <div id="packagesSection" style="display: none;">
                </div>

                <!-- Package Label Operations -->
                <div class="operations-section">
                    <h5>📦 Paket Etiket İşlemleri</h5>
                    <div class="simple-operations">
                        <button onclick="printSelectedPackageLabels(${product.id})" class="btn btn-primary btn-large" id="printPackagesBtn" disabled>
                            🖨️ Seçili Paketleri Yazdır
                        </button>
                        <p class="operation-hint">Paketleri seçip yazdırmak için yukarıdan paket işaretleyin</p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="actions-section">
                    <button onclick="closeBarcodeModal()" class="btn btn-outline">
                        ❌ Kapat
                    </button>
                </div>
            </div>
        `;

        content.innerHTML = html;
        
    }



    // Render barcode using JsBarcode
    function renderBarcode(container, text, options) {
        console.log('🔍 renderBarcode called with:', { text, options, hasJsBarcode: !!window.JsBarcode });
        
        if (!container || !text) {
            console.warn('❌ Missing container or text:', { container: !!container, text });
            return;
        }

        try {
            // Clean and validate barcode text
            const cleanText = String(text).replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
            console.log('🧹 Cleaned text:', cleanText);
            
            if (!cleanText || cleanText.length < 3) {
                console.warn('❌ Invalid barcode text:', text);
                container.innerHTML = `<div class="barcode-fallback">Invalid Barcode: ${text}</div>`;
                return;
            }
            
            const canvas = document.createElement('canvas');
            container.innerHTML = '';
            container.appendChild(canvas);

            if (window.JsBarcode) {
                console.log('✅ JsBarcode available, generating...');
                
                // High-quality Zebra ZD220 optimized settings
                canvas.width = 600;
                canvas.height = 200;
                canvas.style.width = '50mm';
                canvas.style.height = '20mm';
                canvas.style.imageRendering = 'crisp-edges';
                
                window.JsBarcode(canvas, cleanText, {
                    format: 'CODE128',
                    width: 4,
                    height: 80,
                    displayValue: true,
                    fontSize: 16,
                    textMargin: 4,
                    margin: 8,
                    background: '#ffffff',
                    lineColor: '#000000'
                });
                
                console.log('✅ Barcode generated successfully');
            } else {
                console.warn('❌ JsBarcode not loaded');
                container.innerHTML = `<div class="barcode-fallback">JsBarcode not loaded</div>`;
            }
        } catch (error) {
            console.error('❌ Barcode render error:', error);
            container.innerHTML = `<div class="barcode-fallback">Error: ${error.message}</div>`;
        }
    }



    // Print simple barcodes for selected products - Shelf-admin quality
    window.printBarcodes = function() {
        if (!window.selectedProducts || window.selectedProducts.length === 0) {
            showMessage('Yazdırmak için ürün seçiniz', 'error');
            return;
        }

        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                throw new Error('Pop-up blocker tarafından engellendi');
            }

            const products = window.selectedProducts.map(id => window.products.find(p => p.id === id)).filter(p => p);
            
            const printHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Ürün Barkod Etiketleri - Zebra ZD220</title>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                    <style>
                        @page { margin: 0.5cm; }
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 20px;
                            background: white;
                        }
                        .label { 
                            width: 10cm; 
                            height: 6cm; 
                            border: 2px solid #000; 
                            padding: 20px; 
                            margin: 10px; 
                            display: inline-block; 
                            text-align: center;
                            background: white;
                            page-break-inside: avoid;
                            vertical-align: top;
                        }
                        .header { 
                            font-size: 14px; 
                            font-weight: bold; 
                            margin-bottom: 8px; 
                            color: #333;
                        }
                        .product-name { 
                            font-size: 16px; 
                            font-weight: bold; 
                            margin: 8px 0; 
                            word-wrap: break-word;
                            max-height: 40px;
                            overflow: hidden;
                        }
                        .sku-info { 
                            font-size: 11px; 
                            color: #666; 
                            margin: 3px 0;
                        }
                        #barcode { 
                            margin: 10px 0; 
                        }
                        @media print {
                            body { margin: 0; }
                            .label { 
                                margin: 5px; 
                                border: 1px solid #000; 
                            }
                        }
                    </style>
                </head>
                <body>
                    ${products.map((product, index) => {
                        const code = product.main_barcode || product.sku || 'NOBARCODE';
                        const name = product.name || 'Ürün Adı Yok';
                        const sku = product.sku || 'SKU YOK';
                        const date = new Date().toLocaleDateString('tr-TR');
                        
                        return `
                            <div class="label">
                                <div class="header">WMS ÜRÜN ETİKETİ</div>
                                <div class="product-name">${name.substring(0, 30)}</div>
                                <svg id="barcode${index}"></svg>
                                <div class="sku-info">SKU: ${sku}</div>
                                <div class="sku-info">${date}</div>
                            </div>
                        `;
                    }).join('')}
                    <script>
                        setTimeout(function() {
                            try {
                                ${products.map((product, index) => {
                                    const code = product.main_barcode || product.sku || 'NOBARCODE';
                                    return `
                                        JsBarcode("#barcode${index}", "${code}", {
                                            format: "CODE128",
                                            width: 3,
                                            height: 50,
                                            displayValue: false,
                                            margin: 0,
                                            background: "#ffffff",
                                            lineColor: "#000000"
                                        });
                                    `;
                                }).join('')}
                                setTimeout(function() { window.print(); }, 1000);
                            } catch(e) {
                                console.error("Barkod oluşturma hatası:", e);
                                window.print();
                            }
                        }, 500);
                    </script>
                </body>
                </html>
            `;
            
            printWindow.document.write(printHTML);
            printWindow.document.close();

            showMessage(`${products.length} ürün için kaliteli barkod yazdırılıyor`, 'success');

        } catch (error) {
            console.error('❌ Print error:', error);
            showMessage('Yazdırma hatası: ' + error.message, 'error');
        }
    };

    // Load product packages asynchronously
    async function loadProductPackagesAsync(productId) {
        try {
            const response = await fetch(`/api/products/${productId}/packages`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || []);
        } catch (error) {
            console.error('❌ Load packages error:', error);
            return [];
        }
    }

    // Render barcode operations with packages data
    function renderBarcodeOperationsWithPackages(product, packages) {
        const loadingSection = document.getElementById('packagesLoadingSection');
        const packagesSection = document.getElementById('packagesSection');
        
        if (!loadingSection || !packagesSection) return;

        // Hide loading, show packages
        loadingSection.style.display = 'none';
        packagesSection.style.display = 'block';

        // Render packages section
        if (packages && packages.length > 0) {
            packagesSection.innerHTML = `
                <div class="packages-section">
                    <h5>Alt Paketler <span class="package-count">(${packages.length} adet)</span></h5>
                    <div class="packages-grid">
                        ${packages.map(pkg => `
                            <div class="package-card" data-package-id="${pkg.id}">
                                <div class="package-header">
                                    <input type="checkbox" class="package-checkbox" id="pkg_${pkg.id}" onchange="updatePackageSelection()">
                                    <label for="pkg_${pkg.id}" class="package-name">${escapeHtml(pkg.package_number || pkg.name)}</label>
                                </div>
                                <div class="package-details">
                                    ${pkg.barcode ? `<div class="package-barcode">📊 ${pkg.barcode}</div>` : ''}
                                    ${pkg.dimensions ? `<div class="package-dimensions">📏 ${pkg.dimensions}</div>` : ''}
                                    ${pkg.weight ? `<div class="package-weight">⚖️ ${pkg.weight}kg</div>` : ''}
                                    ${pkg.contents ? `<div class="package-contents">📦 ${escapeHtml(pkg.contents.substring(0, 50))}...</div>` : ''}
                                </div>
                                <div class="package-actions">
                                    <button onclick="previewPackageLabel('${pkg.id}')" class="btn btn-small btn-outline">👁️ Önizle</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="packages-footer">
                        <button onclick="selectAllPackages()" class="btn btn-small btn-secondary">Tümünü Seç</button>
                        <button onclick="deselectAllPackages()" class="btn btn-small btn-secondary">Seçimi Temizle</button>
                        <span class="selection-count" id="selectionCount">0 paket seçili</span>
                    </div>
                </div>
            `;
        } else {
            packagesSection.innerHTML = `
                <div class="packages-section">
                    <div class="empty-packages">
                        <div class="empty-icon">📦</div>
                        <p>Bu ürün için henüz paket tanımlanmamış</p>
                        <p class="empty-hint">Paket eklemek için ürün yönetimi bölümünü kullanın</p>
                    </div>
                </div>
            `;
        }

        // Store packages globally for use in other functions
        window.currentProductPackages = packages;
        updatePackageSelection();
    }

    // Update package selection count
    window.updatePackageSelection = function() {
        const checkboxes = document.querySelectorAll('.package-checkbox:checked');
        const count = checkboxes.length;
        const countElement = document.getElementById('selectionCount');
        const printBtn = document.getElementById('printPackagesBtn');
        
        if (countElement) {
            countElement.textContent = `${count} paket seçili`;
        }
        
        if (printBtn) {
            printBtn.disabled = count === 0;
            printBtn.textContent = count > 0 ? `Seçili Paketler (${count})` : 'Seçili Paketler';
        }
    };

    // Select all packages
    window.selectAllPackages = function() {
        const checkboxes = document.querySelectorAll('.package-checkbox');
        checkboxes.forEach(cb => cb.checked = true);
        updatePackageSelection();
    };

    // Deselect all packages
    window.deselectAllPackages = function() {
        const checkboxes = document.querySelectorAll('.package-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        updatePackageSelection();
    };

    // Print package labels
    window.printPackageLabels = function(productId) {
        const product = window.products.find(p => p.id === productId);
        if (!product) {
            showMessage('Ürün bulunamadı', 'error');
            return;
        }
        
        showMessage(`${product.name} için paket etiketleri yazdırılıyor...`, 'info');
        // TODO: Implement package labels printing logic
    };

    // Print selected package labels
    window.printSelectedPackageLabels = function(productId) {
        const selectedCheckboxes = document.querySelectorAll('.package-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showMessage('Lütfen yazdırılacak paketleri seçin', 'warning');
            return;
        }

        const selectedPackageIds = Array.from(selectedCheckboxes).map(cb => {
            return cb.id.replace('pkg_', '');
        });

        const selectedPackages = window.currentProductPackages.filter(pkg => 
            selectedPackageIds.includes(pkg.id.toString())
        );

        if (selectedPackages.length === 0) {
            showMessage('Seçili paketler bulunamadı', 'error');
            return;
        }

        printCustomPackageLabels(selectedPackages);
    };

    // Preview package label
    window.previewPackageLabel = function(packageId) {
        const pkg = window.currentProductPackages?.find(p => p.id.toString() === packageId.toString());
        if (!pkg) {
            showMessage('Paket bulunamadı', 'error');
            return;
        }

        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        const labelHTML = generateCustomPackageLabelHTML(pkg, BARCODE_TEMPLATES.package_15x10);
        
        previewWindow.document.write(`
            <html>
                <head>
                    <title>Paket Etiket Önizleme - ${pkg.package_number || pkg.name}</title>
                    <style>${getPackageLabelCSS()}</style>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                </head>
                <body>
                    <div class="preview-container">
                        <h2>Paket Etiket Önizleme</h2>
                        ${labelHTML}
                    </div>
                </body>
            </html>
        `);
        
        // Render barcodes from main window context (same approach as print but higher quality)
        previewWindow.onload = function() {
            console.log('🎯 Preview window loaded');
            
            setTimeout(() => {
                const barcodeContainers = previewWindow.document.querySelectorAll('.barcode-container[data-barcode], .vertical-barcode-container[data-barcode]');
                console.log('🔍 Preview window - Found', barcodeContainers.length, 'barcode containers');
                
                barcodeContainers.forEach((container, index) => {
                    const barcodeText = container.getAttribute('data-barcode');
                    console.log('📊 Preview: Rendering barcode', index, ':', barcodeText);
                    
                    if (barcodeText && barcodeText.trim() !== '' && previewWindow.JsBarcode) {
                        try {
                            const cleanText = String(barcodeText).replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
                            
                            // Use shelf-admin method for preview too - KÜÇÜK BARKOD
                            const uniqueId = 'preview-barcode-' + index;
                            
                            // Different sizes for vertical vs regular barcode containers
                            const isVertical = container.classList.contains('vertical-barcode-container');
                            const svgStyle = isVertical ? 'width:40mm;height:12mm;' : 'width:50mm;height:18mm;';
                            
                            container.innerHTML = `<svg id="${uniqueId}" style="${svgStyle}"></svg>`;
                            
                            // Use preview window's JsBarcode with ID selector - KÜÇÜK BARKOD
                            const barcodeSettings = isVertical ? {
                                format: "CODE128",
                                width: 5,     // Ultra kalın çizgiler
                                height: 85,   // Ultra yükseklik dev alan için
                                displayValue: false,
                                margin: 4,    // Ultra büyük margin
                                background: "#ffffff",
                                lineColor: "#000000"
                            } : {
                                format: "CODE128",
                                width: 3,     // Küçültüldü
                                height: 60,   // Küçültüldü
                                displayValue: false,
                                margin: 5,
                                background: "#ffffff",
                                lineColor: "#000000"
                            };
                            
                            previewWindow.JsBarcode("#" + uniqueId, cleanText, barcodeSettings);
                            
                            console.log('✅ Preview barcode rendered successfully:', cleanText);
                            
                        } catch (error) {
                            console.error('❌ Preview barcode render error:', error);
                            container.innerHTML = '<div style="font-family:monospace;font-size:10px;border:1px solid #ccc;padding:4px;text-align:center;">Barkod: ' + barcodeText + '</div>';
                        }
                    }
                });
            }, 500);
        };
    };

    // Preview barcode
    window.previewBarcode = function(productId) {
        const product = window.products.find(p => p.id === productId);
        if (!product) {
            showMessage('Ürün bulunamadı', 'error');
            return;
        }
        
        // Create preview window
        const previewWindow = window.open('', '_blank', 'width=600,height=400');
        previewWindow.document.write(`
            <html>
                <head>
                    <title>Barkod Önizleme - ${product.name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .preview-card { border: 1px solid #ddd; padding: 15px; margin: 10px; display: inline-block; }
                        .barcode { font-family: 'Courier New', monospace; font-size: 14px; letter-spacing: 1px; }
                    </style>
                </head>
                <body>
                    <h2>Barkod Önizleme: ${product.name}</h2>
                    <div class="preview-card">
                        <div><strong>${product.name}</strong></div>
                        <div class="barcode">|||||  |||  ||  |||||</div>
                        <div>SKU: ${product.sku}</div>
                        ${product.main_barcode ? `<div>Barkod: ${product.main_barcode}</div>` : ''}
                        ${product.price ? `<div>Fiyat: ₺${product.price}</div>` : ''}
                    </div>
                </body>
            </html>
        `);
    };



    // Generate custom package label HTML with specified format
    function generateCustomPackageLabelHTML(pkg, template = null) {
        // Get template dimensions
        const templateInfo = template || BARCODE_TEMPLATES.package_15x10;
        
        return `
            <div class="custom-package-label" data-template="${template ? template.name : 'default'}">
                <!-- Ana Template (Sola dayalı) -->
                <div class="main-template-area">
                    <!-- Header with Logo and Product Name -->
                    <div class="label-header">
                        <div class="logo-section">
                            <img src="/assets/images/black-logo.png" alt="Logo" class="company-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div class="logo-placeholder" style="display:none;">LOGO</div>
                        </div>
                        <div class="product-name-section">
                            <div class="main-product-name">${formatBilingualText(pkg.product_name, pkg.product_name_en, 'ANA ÜRÜN ADI')}</div>
                            <div class="package-subtitle">${formatBilingualText(pkg.package_name, pkg.package_name_en, 'PAKET ADI')}</div>
                        </div>
                    </div>
                    
                    <!-- Main Content Area -->
                    <div class="label-body">
                        <!-- Left Section (Critical + Barcode) -->
                        <div class="left-section">
                            <div class="package-info-group">
                                <div class="info-label">PAKET NO / PACKAGE NO</div>
                                <div class="info-value">${escapeHtml(pkg.package_number || pkg.name || 'N/A')}</div>
                                <div class="info-label" style="margin-top: 2mm;">RENK / COLOR</div>
                                <div class="info-value">${formatBilingualText(pkg.color, pkg.color_en, 'N/A')}</div>
                            </div>
                        </div>
                        
                        <!-- Right Section (Dimensions) -->
                        <div class="right-section">
                            <div class="dimensions-group">
                                <div class="dimensions-title">PAKET ÖLÇÜLERİ / PACKAGE DIMENSIONS</div>
                                <div class="dimension-item">- Yükseklik / Height: ${pkg.height || pkg.dimensions_height || '..'} cm</div>
                                <div class="dimension-item">- Genişlik / Width: ${pkg.width || pkg.dimensions_width || '..'} cm</div>
                                <div class="dimension-item">- Uzunluk / Length: ${pkg.length || pkg.dimensions_length || '..'} cm</div>
                                <div class="dimension-summary">
                                    <span>- M³: ${pkg.volume_m3 || pkg.volume || pkg.cubic_volume || pkg.m3 || '..'}</span>
                                    <span class="weight-info">- KG: ${pkg.weight_kg || pkg.weight || pkg.total_weight || pkg.kg || '..'}</span>
                                </div>
                                
                                <!-- BARKOD ALANI - M³/KG ALTINDA -->
                                <div class="barcode-section-inline">
                                    <div class="barcode-container" data-barcode="${pkg.barcode || pkg.package_number || '530501354649'}">
                                        <div class="barcode-placeholder">||||| ||| ||||</div>
                                    </div>
                                    <div class="barcode-number">${pkg.barcode || pkg.package_number || '530501354649'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Package Content Section -->
                    <div class="content-section">
                        <div class="content-title">PAKET İÇERİĞİ / PACKAGE CONTENT</div>
                        <div class="content-list">
                            ${generatePackageContentList(pkg)}
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="label-footer">
                        <span></span>
                        <span></span>
                    </div>
                </div>
                
                <!-- Sağ 4cm Dikey Alan -->
                <div class="right-vertical-sidebar">
                    <!-- Ana Ürün Adı (Türkçe/İngilizce) -->
                    <div class="vertical-main-product-name">${formatBilingualText(pkg.product_name, pkg.product_name_en, 'ANA ÜRÜN ADI')}</div>
                    
                    <!-- Paket Adı -->
                    <div class="vertical-package-name">${escapeHtml(pkg.name || pkg.package_name || 'N/A')}</div>
                    
                    <!-- Paket Numarası -->
                    <div class="vertical-package-number-section">
                        <div class="vertical-package-number-label">PAKET NO</div>
                        <div class="vertical-package-number-value">${escapeHtml(pkg.package_number || pkg.name || 'N/A')}</div>
                    </div>
                    
                    <!-- Renk/Color Alanı -->
                    <div class="vertical-color-section">
                        <div class="vertical-color-label">RENK / COLOR</div>
                        <div class="vertical-color-value">${formatBilingualText(pkg.color, pkg.color_en, 'N/A')}</div>
                    </div>
                    
                    <!-- Sağ Alandaki Dikey Barkod (90 derece döndürülmüş) -->
                    <div class="vertical-barcode-section">
                        <div class="vertical-barcode-container" data-barcode="${pkg.barcode || pkg.package_number || '530501354649'}">
                            <div class="barcode-placeholder">||||| ||| ||||</div>
                        </div>
                        <div class="vertical-barcode-number">${pkg.barcode || pkg.package_number || '530501354649'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate package content list
    function generatePackageContentList(pkg) {
        const contentsTR = pkg.contents || pkg.package_content || '';
        const contentsEN = pkg.contents_en || pkg.package_content_en || '';
        
        if (!contentsTR && !contentsEN) {
            return `
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
                <div class="content-item">• ………………………………………………………</div>
            `;
        }
        
        const itemsTR = contentsTR ? contentsTR.split('\n').filter(item => item.trim()) : [];
        const itemsEN = contentsEN ? contentsEN.split('\n').filter(item => item.trim()) : [];
        const maxItems = Math.max(12, Math.max(itemsTR.length, itemsEN.length));
        let html = '';
        
        for (let i = 0; i < maxItems; i++) {
            const itemTR = itemsTR[i] || '';
            const itemEN = itemsEN[i] || '';
            
            if (itemTR && itemEN) {
                html += `<div class="content-item">• ${escapeHtml(itemTR)} / ${escapeHtml(itemEN)}</div>`;
            } else if (itemTR) {
                html += `<div class="content-item">• ${escapeHtml(itemTR)}</div>`;
            } else if (itemEN) {
                html += `<div class="content-item">• ${escapeHtml(itemEN)}</div>`;
            } else {
                html += `<div class="content-item">• ………………………………………………………</div>`;
            }
        }
        
        return html;
    }

    // Get package label CSS
    function getPackageLabelCSS() {
        return `
            .preview-container {
                padding: 20px;
                background: #f5f5f5;
            }
            
            .custom-package-label {
                width: 195mm;
                height: 95mm;
                background: transparent;
                border: none;
                font-family: Arial, sans-serif;
                font-size: 9pt;
                line-height: 1.1;
                margin: 20px auto;
                display: flex;
                flex-direction: column;
            }
            
            /* Zebra ZD220 template - BÜYÜK YAZILAR */
            .custom-package-label[data-template*="zebra"] {
                width: 195mm;
                height: 94mm;
                font-size: 13pt;
                font-weight: 600;
                line-height: 1.0;
            }
            
            /* 10x15cm template */
            .custom-package-label[data-template*="10x15"] {
                width: 100mm;
                height: 150mm;
            }
            
            .custom-package-label {
                display: flex;
                position: relative;
            }
            
            .right-vertical-sidebar {
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 20mm;
                border-left: 2px solid #000;
                padding: 2mm 0.5mm;
                display: flex;
                flex-direction: row;
                justify-content: space-evenly;
                align-items: stretch;
                text-align: center;
                background: transparent;
                z-index: 2;
            }
            
            .vertical-main-product-name {
                font-size: 6pt;
                font-weight: bold;
                color: #000;
                word-wrap: break-word;
                line-height: 1.0;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                transform: rotate(180deg);
                width: 5mm;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                flex-shrink: 0;
                padding: 1.5mm 0;
            }
            
            .vertical-package-name {
                font-size: 6pt;
                font-weight: bold;
                color: #000;
                word-wrap: break-word;
                line-height: 1.0;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                transform: rotate(180deg);
                width: 3mm;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                flex-shrink: 0;
                padding: 1mm 0;
            }
            
            .vertical-package-number-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 5mm;
                height: 100%;
                justify-content: flex-start;
                flex-shrink: 0;
                padding: 1.5mm 0;
                transform: rotate(180deg);
            }
            
            .vertical-package-number-label {
                font-size: 5pt;
                font-weight: bold;
                color: #000;
                margin-bottom: 3mm;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                white-space: nowrap;
            }
            
            .vertical-package-number-value {
                font-size: 7pt;
                font-weight: bold;
                color: #000;
                writing-mode: vertical-rl;
                text-orientation: mixed;
            }
            
            .vertical-color-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 5mm;
                height: 100%;
                justify-content: flex-start;
                flex-shrink: 0;
                padding: 1.5mm 0;
                transform: rotate(180deg);
            }
            
            .vertical-color-label {
                font-size: 5pt;
                font-weight: bold;
                color: #000;
                margin-bottom: 3mm;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                white-space: nowrap;
            }
            
            .vertical-color-value {
                font-size: 6pt;
                font-weight: normal;
                color: #000;
                writing-mode: vertical-rl;
                text-orientation: mixed;
            }
            
            .vertical-barcode-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 12mm;
                height: 40mm;
                justify-content: center;
                flex-shrink: 0;
                padding: 0.1mm;
                transform: rotate(270deg);
                position: absolute;
                top: 2mm;
                right: 2mm;
                z-index: 10;
            }
            
            .vertical-barcode-container {
                width: 40mm;
                height: 12mm;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                margin: 0;
            }
            
            .vertical-barcode-number {
                font-size: 8pt;
                font-family: monospace;
                text-align: center;
                color: #000;
                margin-top: 2mm;
                font-weight: bold;
            }
            
            .main-template-area {
                width: calc(100% - 22mm);
                margin-right: 22mm;
                display: flex;
                flex-direction: column;
                padding-right: 2mm;
            }

            .label-header {
                display: flex;
                border-bottom: 2px solid #000;
                height: 12mm;
            }
            
            .logo-section {
                width: 25mm;
                padding: 1mm;
                border-right: 1px solid #000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .company-logo {
                max-width: 23mm;
                max-height: 10mm;
                object-fit: contain;
            }
            
            .logo-placeholder {
                font-size: 10pt;
                color: #666;
            }
            
            .product-name-section {
                flex: 1;
                padding: 1mm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-end;
                text-align: right;
            }
            
            .main-product-name {
                font-weight: bold;
                font-size: 15pt;
                margin-bottom: 0.6mm;
                color: #000;
                word-wrap: break-word;
                word-break: break-word;
                line-height: 1.1;
            }
            
            .package-subtitle {
                font-weight: normal;
                font-size: 10pt;
                margin-bottom: 1.2mm;
                color: #666;
                word-wrap: break-word;
                word-break: break-word;
                line-height: 1.2;
            }
            
            .label-body {
                display: flex;
                flex: 1;
                margin-bottom: 7mm;
            }
            
            .left-section {
                width: 50mm;
                padding: 2mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
            }
            
            .left-section::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                height: calc(100% - 5mm);
                width: 2px;
                background: #000;
            }
            
            .right-section {
                flex: 1;
                padding: 2mm;
            }
            
            .package-info-group {
                margin-bottom: 3mm;
            }
            
            .info-label {
                font-size: 7pt;
                font-weight: bold;
                margin-bottom: 1mm;
            }
            
            
            .info-value {
                font-size: 12pt;  /* BÜYÜK YAZILAR */
                font-weight: bold;
            }
            
            .barcode-section {
                text-align: center;
                margin-top: auto;
            }
            
            /* BARKOD ALANI - M³/KG ALTINDA İNLINE */
            .barcode-section-inline {
                margin-top: 1mm;
                text-align: left;
                padding-top: 0mm;
            }
            
            .barcode-container {
                margin: 1mm 0 0 0;
                min-height: 18mm;
                max-width: 50mm;
                width: 50mm;
                height: 18mm;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                padding: 1mm;
            }
            
            .barcode-placeholder {
                font-family: monospace;
                font-size: 12pt;  /* BÜYÜK YAZILAR */
                letter-spacing: 1px;
                font-weight: bold;
                color: #999;
                text-align: center;
            }
            
            .barcode-number {
                font-size: 7pt;
                font-family: monospace;
                margin-top: -2mm;
                text-align: left;
                margin-left: 1mm;
                width: 50mm;
            }
            
            .dimensions-group {
                height: 100%;
            }
            
            .dimensions-title {
                font-size: 7.5pt;
                font-weight: bold;
                margin-bottom: 2mm;
                line-height: 1.1;
                word-wrap: break-word;
            }
            
            .dimension-item {
                font-size: 7pt;
                margin-bottom: 1mm;
            }
            
            .dimension-summary {
                margin-top: 3mm;
                font-size: 7pt;
            }
            
            .weight-info {
                margin-left: 5mm;
            }
            
            .content-section {
                height: 32mm;
                padding: 2.5mm 2mm 1.5mm 2mm;
                border-top: 2px solid #000;
                margin: 0 2mm;
                margin-top: -4mm;
                overflow: hidden;
            }
            
            .content-title {
                font-size: 10pt;
                font-weight: bold;
                margin-bottom: 0.3mm;
            }
            
            .content-list {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: repeat(6, 1fr);
                grid-auto-flow: column;
                gap: 0.6mm 2.5mm;
                padding: 1.5mm;
                border: 1px solid #ccc;
                border-radius: 0.5mm;
                height: 26mm;
                overflow: hidden;
                font-size: 8pt;
                line-height: 1.2;
            }
            
            .content-item {
                font-size: 7pt;
                line-height: 1.2;
                margin-bottom: 0.3mm;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .label-footer {
                padding: 0.5mm 2mm;
                font-size: 5pt;
                color: #666;
                display: flex;
                justify-content: space-between;
                border-top: 1px solid #000;
                margin: 0 2mm;
                margin-top: 1mm;
                height: 3mm;
                align-items: center;
            }
            
            @media print {
                .preview-container {
                    padding: 0;
                    background: transparent !important;
                }
                .custom-package-label {
                    margin: 0;
                    page-break-inside: avoid;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                    background: transparent !important;
                }
                
                /* Metinleri koyu ve net yapmak için */
                .main-product-name, .package-subtitle, .info-label, .info-value, 
                .dimensions-title, .dimension-item, .content-title, .content-item,
                .barcode-number, .label-footer, .vertical-main-product-name, .vertical-package-name,
                .vertical-package-number-label, .vertical-package-number-value,
                .vertical-color-label, .vertical-color-value, .vertical-barcode-number {
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                    font-weight: bold !important;
                }
                
                /* Border'ları koyu yapmak için */
                .label-header, .left-section::after, .content-section, .label-footer, .right-vertical-sidebar {
                    border-color: #000000 !important;
                }
                
                /* Zebra ZD220 300 DPI print settings */
                @media print and (min-resolution: 300dpi) {
                    .custom-package-label[data-template*="zebra"] {
                        width: 19.8cm;
                        height: 9.8cm;
                        font-size: 12pt;
                        line-height: 1.1;
                    }
                    
                    .barcode-container canvas {
                        image-rendering: -webkit-optimize-contrast;
                        image-rendering: crisp-edges;
                        image-rendering: pixelated;
                    }
                }
                
                /* Zebra ZD220 203 DPI print settings */
                @media print and (min-resolution: 203dpi) and (max-resolution: 299dpi) {
                    .custom-package-label[data-template*="zebra"] {
                        width: 19.8cm;
                        height: 9.8cm;
                        font-size: 16pt;  /* BÜYÜK YAZILAR */
                        line-height: 1.2;
                    }
                }
            }
        `;
    }

    // Print custom package labels with template selection
    function printCustomPackageLabels(packages) {
        if (!packages || packages.length === 0) {
            showMessage('Yazdırılacak paket bulunamadı', 'error');
            return;
        }

        // Show template selection modal
        showTemplateSizeSelection(packages);
    }

    // Show template size selection
    function showTemplateSizeSelection(packages) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content small">
                <div class="modal-header">
                    <h3>Etiket Boyutu Seçin</h3>
                </div>
                <div class="modal-body">
                    <p>${packages.length} paket için etiket boyutu seçiniz:</p>
                    <div class="template-size-options" style="display: flex; gap: 10px; justify-content: center; margin: 20px 0; flex-wrap: wrap;">
                        <button onclick="printWithTemplate('package_zebra_zd220', this.dataset.packages)" class="btn btn-success btn-large" data-packages='${JSON.stringify(packages)}' style="background: #2563eb;">
                            🖨️ Zebra ZD220 (19.8x9.8cm) - Kaliteli
                        </button>
                        <button onclick="printWithTemplate('package_15x10', this.dataset.packages)" class="btn btn-primary btn-large" data-packages='${JSON.stringify(packages)}'>
                            📄 15x10 cm (Yatay)
                        </button>
                        <button onclick="printWithTemplate('package_10x15', this.dataset.packages)" class="btn btn-secondary btn-large" data-packages='${JSON.stringify(packages)}'>
                            📄 10x15 cm (Dikey)
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">İptal</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Print with selected template
    window.printWithTemplate = function(templateKey, packagesData) {
        try {
            const packages = typeof packagesData === 'string' ? JSON.parse(packagesData) : packagesData;
            const template = BARCODE_TEMPLATES[templateKey];
            
            if (!template) {
                showMessage('Geçersiz şablon', 'error');
                return;
            }

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                throw new Error('Pop-up blocker tarafından engellendi');
            }

            const labelHTML = packages.map(pkg => generateCustomPackageLabelHTML(pkg, template)).join('');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Paket Etiketleri - ${packages.length} adet (${template.name})</title>
                    <style>${getPackageLabelCSS()}</style>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                </head>
                <body>
                    <div class="preview-container">
                        ${labelHTML}
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Wait for content to load, render barcodes from main window, then print
            printWindow.onload = function() {
                console.log('🎯 Print window loaded');
                
                setTimeout(() => {
                    // Find barcode containers in print window
                    const barcodeContainers = printWindow.document.querySelectorAll('.barcode-container[data-barcode], .vertical-barcode-container[data-barcode]');
                    console.log('🔍 Print window - Found', barcodeContainers.length, 'barcode containers');
                    
                    // Render barcodes from main window context where JsBarcode is available
                    let renderPromises = [];
                    
                    barcodeContainers.forEach((container, index) => {
                        const barcodeText = container.getAttribute('data-barcode');
                        console.log('📊 Rendering barcode', index, ':', barcodeText);
                        
                        if (barcodeText && barcodeText.trim() !== '' && printWindow.JsBarcode) {
                            const renderPromise = new Promise((resolve) => {
                                try {
                                    const cleanText = String(barcodeText).replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
                                    
                                    // Use exact shelf-admin method - SVG with ID selector - KÜÇÜK BARKOD
                                    const uniqueId = 'barcode-pkg-' + index;
                                    
                                    // Different sizes for vertical vs regular barcode containers
                                    const isVertical = container.classList.contains('vertical-barcode-container');
                                    const svgStyle = isVertical ? 'width:40mm;height:12mm;' : 'width:50mm;height:18mm;';
                                    
                                    container.innerHTML = `<svg id="${uniqueId}" style="${svgStyle}"></svg>`;
                                    
                                    // Use print window's JsBarcode with ID selector (shelf-admin method)
                                    // Zebra ZD220 KÜÇÜK BARKOD optimized settings
                                    const barcodeSettings = isVertical ? {
                                        format: "CODE128",
                                        width: 5,     // Ultra kalın çizgiler
                                        height: 85,   // Ultra yükseklik dev alan için
                                        displayValue: false,
                                        margin: 4,    // Ultra büyük margin
                                        background: "#ffffff",
                                        lineColor: "#000000"
                                    } : {
                                        format: "CODE128",
                                        width: 3,     // Küçültüldü
                                        height: 60,   // Küçültüldü
                                        displayValue: false,
                                        margin: 5,    // Küçültüldü
                                        background: "#ffffff",
                                        lineColor: "#000000"
                                    };
                                    
                                    printWindow.JsBarcode("#" + uniqueId, cleanText, barcodeSettings);
                                    
                                    console.log('✅ Barcode rendered successfully:', cleanText);
                                    resolve();
                                    
                                } catch (error) {
                                    console.error('❌ Barcode render error:', error);
                                    container.innerHTML = '<div style="font-family:monospace;font-size:8px;border:1px solid #ccc;padding:2px;">Barkod: ' + barcodeText + '</div>';
                                    resolve();
                                }
                            });
                            
                            renderPromises.push(renderPromise);
                        } else {
                            console.warn('❌ Invalid barcode text or JsBarcode not available:', barcodeText);
                            container.innerHTML = '<div style="font-family:monospace;font-size:8px;border:1px solid #ccc;padding:2px;">Barkod: ' + (barcodeText || 'N/A') + '</div>';
                        }
                    });
                    
                    // Wait for all barcodes to render, then print
                    Promise.all(renderPromises).then(() => {
                        console.log('🏁 All barcodes rendered, starting print');
                        setTimeout(() => {
                            printWindow.print();
                        }, 500);
                    });
                    
                }, 1000);
            };

            showMessage(`${packages.length} paket etiketi yazdırılıyor (${template.name})`, 'success');
            
            // Close both modals
            document.querySelectorAll('.modal').forEach(m => m.remove());
            closeBarcodeModal();

        } catch (error) {
            console.error('❌ Print error:', error);
            showMessage('Yazdırma hatası: ' + error.message, 'error');
        }
    };

    // Format bilingual text (Turkish / English)
    function formatBilingualText(textTR, textEN, fallback = '') {
        const tr = escapeHtml(textTR || '');
        const en = escapeHtml(textEN || '');
        
        if (tr && en) {
            return `${tr} / ${en}`;
        } else if (tr) {
            return tr;
        } else if (en) {
            return en;
        } else {
            return fallback;
        }
    }

    // Utility function to escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Check if JsBarcode is available when module loads
    if (window.JsBarcode) {
        console.log('✅ JsBarcode is available when module loads');
    } else {
        console.warn('⚠️ JsBarcode not available when module loads, will check again later');
        // Try again after a short delay
        setTimeout(() => {
            if (window.JsBarcode) {
                console.log('✅ JsBarcode is now available');
            } else {
                console.error('❌ JsBarcode still not available after delay');
            }
        }, 1000);
    }
    
    console.log('✅ Products Barcode module loaded');
})();