// Products Core - CRUD Operations and Data Management
(function() {
    'use strict';

    // API endpoints
    const API = {
        PRODUCTS: '/api/products',
        PRODUCT_PACKAGES: '/api/product-packages'
    };

    // Load all products from server
    window.loadProducts = async function() {
        try {
            console.log('🔄 Loading products...');
            const response = await fetch(API.PRODUCTS);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ürünler yüklenemedi');
            }
            
            window.products = Array.isArray(result) ? result : (result.data || []);
            window.filteredProducts = [...window.products];
            
            console.log(`✅ ${window.products.length} ürün yüklendi`);
            
            // Debug: Check if any products have packages
            const productsWithPackages = window.products.filter(p => p.packages && p.packages.length > 0);
            console.log(`🔍 Debug: ${productsWithPackages.length} ürünün paketi var`);
            
            if (productsWithPackages.length > 0) {
                console.log('📦 Debug: İlk paketli ürün:', productsWithPackages[0]);
                console.log('📦 Debug: İlk paketli ürünün paketleri:', productsWithPackages[0].packages);
            }
            
            return window.products;
        } catch (error) {
            console.error('❌ Product loading error:', error);
            throw error;
        }
    };


    // Update existing product
    window.saveProduct = async function() {
        try {
            const productId = document.getElementById('editProductId').value;
            const formData = getEditProductFormData();
            
            if (!validateProductForm(formData)) {
                return;
            }

            const response = await fetch(`${API.PRODUCTS}/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ürün güncellenemedi');
            }

            showMessage('Ürün başarıyla güncellendi', 'success');
            closeEditModal();
            await loadProducts();
            filterProducts();
            updateStats();
        } catch (error) {
            console.error('❌ Update product error:', error);
            showMessage('Ürün güncellenirken hata oluştu: ' + error.message, 'error');
        }
    };

    // Delete product
    window.deleteProduct = async function(productId) {
        if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`${API.PRODUCTS}/${productId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ürün silinemedi');
            }

            showMessage('Ürün başarıyla silindi', 'success');
            await loadProducts();
            filterProducts();
            updateStats();
        } catch (error) {
            console.error('❌ Delete product error:', error);
            showMessage('Ürün silinirken hata oluştu: ' + error.message, 'error');
        }
    };

    // Filter and search products
    window.filterProducts = function() {
        if (!window.products || !Array.isArray(window.products)) {
            console.warn('⚠️ Products not loaded yet');
            return;
        }

        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const sortBy = document.getElementById('sortBy')?.value || 'name';

        console.log('🔍 Filtering products:', { searchTerm, statusFilter, sortBy });

        // Filter products
        let filtered = window.products.filter(product => {
            const matchesSearch = !searchTerm || 
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
                (product.main_barcode && product.main_barcode.toLowerCase().includes(searchTerm));

            const matchesStatus = !statusFilter || 
                (statusFilter === 'stocked' && (product.inventory_quantity || 0) > 0) ||
                (statusFilter === 'out-of-stock' && (product.inventory_quantity || 0) === 0) ||
                (statusFilter === 'no-packages' && (!product.packages || product.packages.length === 0)) ||
                (statusFilter === 'has-packages' && (product.packages && product.packages.length > 0)) ||
                (statusFilter === 'no-location' && (!product.location_codes || product.location_codes.length === 0)) ||
                (statusFilter === 'duplicate-barcodes' && hasDuplicateBarcodes(product));

            return matchesSearch && matchesStatus;
        });

        // Sort products
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'sku': return (a.sku || '').localeCompare(b.sku || '');
                case 'price': return (b.price || 0) - (a.price || 0);
                case 'created': return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                default: return (a.name || '').localeCompare(b.name || '');
            }
        });

        window.filteredProducts = filtered;
        window.currentPage = 1; // Reset to first page
        renderProductsTable();
        renderPagination();

        console.log(`✅ Filtered ${filtered.length} products from ${window.products.length} total`);
    };

    // Get form data for new product
    function getNewProductFormData() {
        return {
            sku: document.getElementById('newSku')?.value?.trim() || '',
            name: document.getElementById('newName')?.value?.trim() || '',
            price: parseFloat(document.getElementById('newPrice')?.value) || 0,
            main_barcode: document.getElementById('newBarcode')?.value?.trim() || '',
            description: document.getElementById('newDescription')?.value?.trim() || ''
        };
    }

    // Get form data for edit product
    function getEditProductFormData() {
        return {
            sku: document.getElementById('editSku')?.value?.trim() || '',
            name: document.getElementById('editName')?.value?.trim() || '',
            main_product_name: document.getElementById('editMainProductName')?.value?.trim() || '',
            main_product_name_en: document.getElementById('editMainProductNameEn')?.value?.trim() || '',
            price: parseFloat(document.getElementById('editPrice')?.value) || 0,
            main_barcode: document.getElementById('editBarcode')?.value?.trim() || '',
            description: document.getElementById('editDescription')?.value?.trim() || ''
        };
    }

    // Validate product form data
    function validateProductForm(data) {
        // Clear previous validation errors
        document.querySelectorAll('.validation-error').forEach(el => el.remove());

        let hasErrors = false;

        // SKU validation
        if (!data.sku || data.sku.length < 2) {
            showValidationError('SKU en az 2 karakter olmalı', data.sku ? 'editSku' : 'newSku');
            hasErrors = true;
        }

        // Name validation
        if (!data.name || data.name.length < 2) {
            showValidationError('Ürün adı en az 2 karakter olmalı', data.name ? 'editName' : 'newName');
            hasErrors = true;
        }

        // Price validation
        if (data.price < 0) {
            showValidationError('Fiyat negatif olamaz', data.price ? 'editPrice' : 'newPrice');
            hasErrors = true;
        }

        return !hasErrors;
    }

    // Show validation error
    function showValidationError(message, inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const error = document.createElement('div');
        error.className = 'validation-error';
        error.style.cssText = 'color: var(--danger, #dc3545); font-size: 0.8em; margin-top: 5px;';
        error.textContent = message;

        input.parentNode.appendChild(error);
        input.focus();
    }

    // Check if product has duplicate barcodes across system
    function hasDuplicateBarcodes(product) {
        if (!product.packages || product.packages.length === 0) {
            return false;
        }

        // Check if this product's package barcodes exist in other products
        for (const pkg of product.packages) {
            if (!pkg.barcode) continue;
            
            // Count how many products have this barcode
            const barcodeCount = window.products.filter(p => 
                p.packages && p.packages.some(pkg2 => 
                    pkg2.barcode === pkg.barcode
                )
            ).length;
            
            if (barcodeCount > 1) {
                return true;
            }
        }
        
        return false;
    }

    // Update statistics
    window.updateStats = function() {
        if (!window.products) return;

        const totalProducts = window.products.length;
        const stockedProducts = window.products.filter(p => (p.inventory_quantity || 0) > 0).length;
        const totalPackages = window.products.reduce((sum, p) => sum + (p.packages?.length || 0), 0);
        const totalValue = window.products.reduce((sum, p) => sum + ((p.price || 0) * (p.inventory_quantity || 0)), 0);
        const duplicateBarcodeProducts = window.products.filter(p => hasDuplicateBarcodes(p)).length;

        // Update stat displays
        const elements = {
            totalProducts: document.getElementById('totalProducts'),
            stockedProducts: document.getElementById('stockedProducts'),
            totalPackages: document.getElementById('totalPackages'),
            totalValue: document.getElementById('totalValue')
        };

        if (elements.totalProducts) elements.totalProducts.textContent = totalProducts;
        if (elements.stockedProducts) elements.stockedProducts.textContent = stockedProducts;
        if (elements.totalPackages) elements.totalPackages.textContent = totalPackages;
        if (elements.totalValue) elements.totalValue.textContent = `₺${totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        // Show stats section
        const statsSection = document.getElementById('statsSection');
        if (statsSection) {
            statsSection.style.display = 'flex';
        }
    };

    // CSV Export functionality
    window.exportToCSV = function() {
        if (!window.products || window.products.length === 0) {
            showMessage('Export edilecek ürün bulunamadı', 'warning');
            return;
        }

        try {
            console.log('📥 CSV export başlatılıyor...');
            
            // CSV headers
            const headers = [
                'SKU',
                'Ürün Adı (Türkçe)',
                'Ürün Adı (İngilizce)',
                'Ana Ürün Adı (Türkçe)',
                'Ana Ürün Adı (İngilizce)',
                'Ürün Rengi (Türkçe)',
                'Ürün Rengi (İngilizce)',
                'Fiyat',
                'Ana Barkod',
                'Açıklama',
                'Uzunluk (cm)',
                'Genişlik (cm)',
                'Yükseklik (cm)',
                'Ağırlık (kg)',
                'Hacim (cm³)',
                'Oluşturma Tarihi',
                'Paket Numarası',
                'Paket Adı (Türkçe)',
                'Paket Adı (İngilizce)',
                'Paket İçeriği (Türkçe)',
                'Paket İçeriği (İngilizce)',
                'Paket Barkodu',
                'Paket Miktarı',
                'Paket Uzunluk (cm)',
                'Paket Genişlik (cm)',
                'Paket Yükseklik (cm)',
                'Paket Ağırlık (kg)',
                'Paket Hacim (cm³)'
            ];

            // CSV rows
            const rows = [];
            rows.push(headers.join(','));

            window.products.forEach(product => {
                const baseData = [
                    escapeCSV(product.sku || ''),
                    escapeCSV(product.name || ''), // Ürün Adı (Türkçe)
                    escapeCSV(product.name_en || ''), // Ürün Adı (İngilizce)
                    escapeCSV(product.main_product_name || ''), // Ana Ürün Adı (Türkçe)
                    escapeCSV(product.main_product_name_en || ''), // Ana Ürün Adı (İngilizce)
                    escapeCSV(product.color_tr || ''), // Ürün Rengi (Türkçe)
                    escapeCSV(product.color_en || ''), // Ürün Rengi (İngilizce)
                    product.price || 0,
                    escapeCSV(product.main_barcode || ''),
                    escapeCSV(product.description || ''),
                    product.length || '', // Uzunluk (cm)
                    product.width || '', // Genişlik (cm)
                    product.height || '', // Yükseklik (cm)
                    product.weight || '', // Ağırlık (kg)
                    product.volume || '', // Hacim (cm³)
                    product.created_at || '',
                    '', // Paket numarası placeholder
                    '', // Paket adı (Türkçe) placeholder
                    '', // Paket adı (İngilizce) placeholder
                    '', // Paket içeriği (Türkçe) placeholder
                    '', // Paket içeriği (İngilizce) placeholder
                    '', // Paket barkodu placeholder
                    '', // Paket miktarı placeholder
                    '', // Paket uzunluk placeholder
                    '', // Paket genişlik placeholder
                    '', // Paket yükseklik placeholder
                    '', // Paket ağırlık placeholder
                    ''  // Paket hacim placeholder
                ];

                if (product.packages && product.packages.length > 0) {
                    // Her paket için ayrı satır
                    product.packages.forEach(pkg => {
                        const rowData = [...baseData];
                        rowData[16] = escapeCSV(pkg.package_number || ''); // Paket numarası
                        rowData[17] = escapeCSV(pkg.name || ''); // Paket adı (Türkçe)
                        rowData[18] = escapeCSV(pkg.name_en || ''); // Paket adı (İngilizce)
                        rowData[19] = escapeCSV(pkg.contents || ''); // Paket içeriği (Türkçe)
                        rowData[20] = escapeCSV(pkg.contents_en || ''); // Paket içeriği (İngilizce)
                        rowData[21] = escapeCSV(pkg.barcode || ''); // Paket barkodu
                        rowData[22] = pkg.quantity || 0; // Paket miktarı
                        rowData[23] = pkg.length || ''; // Paket uzunluk (cm)
                        rowData[24] = pkg.width || ''; // Paket genişlik (cm)
                        rowData[25] = pkg.height || ''; // Paket yükseklik (cm)
                        rowData[26] = pkg.weight || ''; // Paket ağırlık (kg)
                        rowData[27] = pkg.volume || ''; // Paket hacim (cm³)
                        rows.push(rowData.join(','));
                    });
                } else {
                    // Paket yoksa ürünü tek satırda ekle
                    rows.push(baseData.join(','));
                }
            });

            // CSV content
            const csvContent = rows.join('\n');
            const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
            const finalContent = BOM + csvContent;

            // Download file
            const blob = new Blob([finalContent], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
            link.setAttribute('download', `products_export_${timestamp}.csv`);
            
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`✅ CSV export tamamlandı: ${window.products.length} ürün`);
            showMessage(`CSV dosyası başarıyla indirildi (${window.products.length} ürün)`, 'success');

        } catch (error) {
            console.error('❌ CSV export error:', error);
            showMessage('CSV export sırasında hata oluştu: ' + error.message, 'error');
        }
    };

    // CSV field escaping function
    function escapeCSV(field) {
        if (field === null || field === undefined) return '';
        
        const stringField = String(field);
        
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return '"' + stringField.replace(/"/g, '""') + '"';
        }
        
        return stringField;
    }

    console.log('✅ Products Core module loaded');
})();