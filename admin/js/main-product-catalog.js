/* ===================================
   MAIN PRODUCT CATALOG SYSTEM
   Auto-updating, connected to website product source
   =================================== */

class MainProductCatalog {
    constructor() {
        // Product data
        this.products = [];
        this.filteredProducts = [];
        
        // Readiness state tracking
        this.isInitializing = false;
        this.isReady = false;
        this.hasBoundEvents = false;
        this.hasLoadedInitialData = false;
        this.initializationPromise = null;
        
        // Auto-sync management
        this.autoSyncInterval = null;
        this.lastSyncTime = null;
        
        // Subcategory mapping
        this.subcategories = {
            'Women': ['Bags', 'Dress', 'Shoes', 'Sweater', 'Tshirt'],
            'Men': ['Sneakers', 'Shoes', 'Shirt', 'Shorts', 'Hoodie'],
            'Collection': ['Sunglasses', 'Watches', 'Belts', 'Wallet', 'Caps']
        };
        
        console.log('📦 Main Product Catalog constructor called');
    }
    
    // ===================================
    // SAFE INITIALIZATION FLOW
    // ===================================
    
    async init() {
        console.log('🔄 Main Product Catalog initialization started');
        
        // Prevent duplicate initialization
        if (this.isInitializing || this.isReady) {
            console.log('⚠️ Main Product Catalog already initializing or ready');
            return this.initializationPromise || Promise.resolve();
        }
        
        this.isInitializing = true;
        this.initializationPromise = this._performInitialization();
        
        try {
            await this.initializationPromise;
            console.log('✅ Main Product Catalog initialization completed successfully');
        } catch (error) {
            console.error('❌ Main Product Catalog initialization failed:', error);
            this.isInitializing = false;
            throw error;
        }
        
        return this.initializationPromise;
    }
    
    async _performInitialization() {
        try {
            // Step 1: Wait for DOM readiness
            console.log('🔍 Step 1: Waiting for DOM readiness');
            await this._waitForDOMReady();
            
            // Step 2: Verify required DOM containers exist
            console.log('🔍 Step 2: Verifying DOM containers');
            await this._verifyDOMContainers();
            
            // Step 3: Wait for Firebase readiness
            console.log('🔍 Step 3: Waiting for Firebase readiness');
            await this._waitForFirebase();
            
            // Step 4: Bind event listeners safely
            console.log('🔍 Step 4: Binding event listeners');
            this._bindEventListeners();
            
            // Step 5: Load products
            console.log('🔍 Step 5: Loading products');
            await this._loadProducts();
            
            // Step 6: Render product catalog
            console.log('🔍 Step 6: Rendering product catalog');
            this._renderProductCatalog();
            
            // Step 7: Start auto-sync
            console.log('🔍 Step 7: Starting auto-sync');
            this._startAutoSync();
            
            // Mark as ready
            this.isReady = true;
            this.isInitializing = false;
            console.log('🎉 Main Product Catalog is ready');
            
        } catch (error) {
            console.error('❌ Initialization step failed:', error);
            this.isInitializing = false;
            throw error;
        }
    }
    
    async _waitForDOMReady() {
        if (document.readyState === 'loading') {
            console.log('⏳ Waiting for DOM to be ready...');
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        console.log('✅ DOM is ready');
    }
    
    async _verifyDOMContainers() {
        const requiredElements = [
            'productSearch',
            'productCategoryFilter',
            'productSubCategoryFilter',
            'productStatusFilter',
            'productStockFilter',
            'productList',
            'productsLoading',
            'productsEmpty'
        ];
        
        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Required DOM element not found: #${elementId}`);
            }
        }
        
        console.log('✅ All required DOM containers found');
    }
    
    async _waitForFirebase() {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 100;
        let waitTime = 0;
        
        while (!window.firebaseDB && waitTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        
        if (!window.firebaseDB) {
            throw new Error('Firebase not available after timeout');
        }
        
        console.log('✅ Firebase is ready');
    }
    
    _bindEventListeners() {
        if (this.hasBoundEvents) {
            console.log('⚠️ Event listeners already bound');
            return;
        }
        
        // Search and filters
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('productCategoryFilter')?.addEventListener('change', () => {
            this.updateSubcategoryOptions();
            this.applyFilters();
        });
        
        document.getElementById('productSubCategoryFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('productStatusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('productStockFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Add product button
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.openAddProductModal();
        });
        
        this.hasBoundEvents = true;
        console.log('✅ Event listeners bound');
    }
    
    async _loadProducts() {
        try {
            this.showLoadingState();
            
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productsRef = ref(window.firebaseDB, 'products');
            const snapshot = await get(productsRef);
            
            if (snapshot.exists()) {
                const firebaseProducts = snapshot.val();
                this.products = Object.values(firebaseProducts).map(product => ({
                    id: product.id || Object.keys(firebaseProducts).find(key => firebaseProducts[key] === product)[0],
                    name: product.name || 'Unknown Product',
                    price: product.price || 0,
                    category: product.category || 'Uncategorized',
                    subCategory: product.subCategory || '',
                    color: product.color || 'Default',
                    size: product.size || '',
                    img: product.imgUrl || product.img || 'https://via.placeholder.com/60x60',
                    stock: product.stock || 0,
                    isActive: product.isActive !== false,
                    description: product.description || '',
                    createdAt: product.createdAt || Date.now(),
                    updatedAt: product.updatedAt || Date.now()
                }));
                
                console.log(`✅ Loaded ${this.products.length} products from Firebase`);
            } else {
                console.log('⚠️ No products found in Firebase');
                this.products = [];
            }
            
            this.hasLoadedInitialData = true;
            this.lastSyncTime = Date.now();
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            throw error;
        }
    }
    
    _renderProductCatalog() {
        // Apply initial filters and render
        this.applyFilters();
        console.log('✅ Initial product catalog rendered');
    }
    
    _startAutoSync() {
        // Set up auto-refresh every 30 seconds
        this.autoSyncInterval = setInterval(() => {
            this.autoRefreshCatalog();
        }, 30000);
        
        console.log('🔄 Auto-sync enabled (30-second intervals)');
    }
    
    // ===================================
    // EVENT LISTENERS
    // ===================================
    
    setupEventListeners() {
        // Search and filters
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('productCategoryFilter')?.addEventListener('change', () => {
            this.updateSubcategoryOptions();
            this.applyFilters();
        });
        
        document.getElementById('productSubCategoryFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('productStatusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('productStockFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Add product button
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.openAddProductModal();
        });
    }
    
    // ===================================
    // REAL DATA SOURCE CONNECTION
    // ===================================
    
    async loadProductCatalog() {
        console.log('🔄 Loading product catalog from website data source...');
        
        // Ensure system is ready first
        if (!this.isReady) {
            console.log('⚠️ Product catalog not ready, initializing...');
            await this.init();
        }
        
        try {
            // Show loading state
            this.showLoadingState();
            
            // Reload products from Firebase
            await this._loadProducts();
            
            // Apply filters and render
            this.applyFilters();
            
            console.log(`✅ Product catalog loaded: ${this.products.length} products`);
            
        } catch (error) {
            console.error('❌ Error loading product catalog:', error);
            this.showErrorState(error);
            throw error;
        }
    }
    
    // ===================================
    // AUTO-SYNC SYSTEM
    // ===================================
    
    async autoRefreshCatalog() {
        try {
            console.log('🔄 Auto-refreshing product catalog...');
            
            // Store current products for comparison
            const previousProducts = [...this.products];
            
            // Reload from Firebase
            await this._loadProducts();
            
            // Check for changes
            const hasChanges = this.detectChanges(previousProducts, this.products);
            
            if (hasChanges) {
                console.log('🔄 Changes detected, updating catalog...');
                this.applyFilters();
                this.showToast('Product catalog updated', 'success');
            }
            
        } catch (error) {
            console.error('❌ Auto-refresh failed:', error);
        }
    }
    
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('⏹️ Auto-sync stopped');
        }
    }
    
    detectChanges(previous, current) {
        // Simple change detection
        if (previous.length !== current.length) {
            return true;
        }
        
        // Check for product updates
        for (let i = 0; i < current.length; i++) {
            const prevProduct = previous.find(p => p.id === current[i].id);
            if (!prevProduct || JSON.stringify(prevProduct) !== JSON.stringify(current[i])) {
                return true;
            }
        }
        
        return false;
    }
    
    // ===================================
    // SEARCH AND FILTER
    // ===================================
    
    handleSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.applyFilters();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        this.filteredProducts = this.products.filter(product => {
            return (
                (product.name && product.name.toLowerCase().includes(searchLower)) ||
                (product.category && product.category.toLowerCase().includes(searchLower)) ||
                (product.subCategory && product.subCategory.toLowerCase().includes(searchLower)) ||
                (product.color && product.color.toLowerCase().includes(searchLower))
            );
        });
        
        this.renderProductCatalog();
        console.log(`🔍 Catalog search results: ${this.filteredProducts.length} products for "${searchTerm}"`);
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('productCategoryFilter')?.value || '';
        const subCategoryFilter = document.getElementById('productSubCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('productStatusFilter')?.value || '';
        const stockFilter = document.getElementById('productStockFilter')?.value || '';
        
        // Start with all products
        this.filteredProducts = [...this.products];
        
        // Category filter
        if (categoryFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => 
                product.category === categoryFilter
            );
        }
        
        // Subcategory filter
        if (subCategoryFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => 
                product.subCategory === subCategoryFilter
            );
        }
        
        // Status filter
        if (statusFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => {
                switch (statusFilter) {
                    case 'active':
                        return product.isActive !== false;
                    case 'inactive':
                        return product.isActive === false;
                    default:
                        return true;
                }
            });
        }
        
        // Stock filter
        if (stockFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => {
                switch (stockFilter) {
                    case 'in_stock':
                        return product.stock > 10;
                    case 'low_stock':
                        return product.stock > 0 && product.stock <= 10;
                    case 'out_of_stock':
                        return product.stock <= 0;
                    default:
                        return true;
                }
            });
        }
        
        this.renderProductCatalog();
    }
    
    updateSubcategoryOptions() {
        const categoryFilter = document.getElementById('productCategoryFilter')?.value || '';
        const subCategoryFilter = document.getElementById('productSubCategoryFilter');
        
        if (!subCategoryFilter) return;
        
        // Clear current options
        subCategoryFilter.innerHTML = '<option value="">All Subcategories</option>';
        
        if (categoryFilter && this.subcategories[categoryFilter]) {
            this.subcategories[categoryFilter].forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = sub;
                subCategoryFilter.appendChild(option);
            });
        }
    }
    
    // ===================================
    // RENDERING
    // ===================================
    
    renderProductCatalog() {
        const productList = document.getElementById('productList');
        const emptyState = document.getElementById('productsEmpty');
        const loadingState = document.getElementById('productsLoading');
        
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredProducts.length === 0) {
            productList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        // Hide empty state
        if (emptyState) emptyState.style.display = 'none';
        
        // Render products as admin-friendly cards/list items
        productList.innerHTML = this.filteredProducts.map(product => `
            <div class="product-item" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.img}" alt="${product.name}" class="product-thumbnail">
                    <div class="product-status-indicator ${product.isActive !== false ? 'active' : 'inactive'}"></div>
                </div>
                <div class="product-info">
                    <div class="product-header">
                        <h4 class="product-name">${product.name}</h4>
                        <div class="product-price">$${product.price.toFixed(2)}</div>
                    </div>
                    <div class="product-meta">
                        <span class="category-badge ${product.category.toLowerCase()}">${product.category}</span>
                        <span class="subcategory-badge">${product.subCategory || 'N/A'}</span>
                        <span class="color-badge">${product.color}</span>
                    </div>
                    <div class="product-details">
                        <span class="size-badge">${product.size || 'N/A'}</span>
                        <span class="stock-badge ${this.getStockClass(product.stock)}">${product.stock} units</span>
                    </div>
                    <div class="product-description">
                        ${product.description ? product.description.substring(0, 100) + '...' : 'No description'}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-primary" onclick="mainProductCatalog.editProduct('${product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="mainProductCatalog.quickStockUpdate('${product.id}')" title="Quick Stock">
                        <i class="fas fa-boxes"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="mainProductCatalog.toggleProductStatus('${product.id}')" title="${product.isActive !== false ? 'Deactivate' : 'Activate'}">
                        <i class="fas fa-${product.isActive !== false ? 'eye-slash' : 'eye'}"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log(`✅ Rendered ${this.filteredProducts.length} products in catalog`);
    }
    
    getStockClass(stock) {
        if (stock <= 0) return 'out-of-stock';
        if (stock <= 10) return 'low-stock';
        return 'in-stock';
    }
    
    // ===================================
    // PRODUCT ACTIONS
    // ===================================
    
    editProduct(productId) {
        // Open existing product edit modal
        if (window.productManager) {
            window.productManager.editProduct(productId);
        } else {
            this.showToast('Product management system loading...', 'info');
        }
    }
    
    async quickStockUpdate(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const newStock = prompt(`Update stock for "${product.name}":`, product.stock);
        if (newStock === null || newStock === '') return;
        
        const stockValue = parseInt(newStock);
        if (isNaN(stockValue) || stockValue < 0) {
            this.showToast('Invalid stock value', 'error');
            return;
        }
        
        try {
            // Update in Firebase
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await update(productRef, { 
                    stock: stockValue,
                    updatedAt: Date.now()
                });
                
                // Update local data
                product.stock = stockValue;
                product.updatedAt = Date.now();
                
                // Refresh catalog
                this.applyFilters();
                
                this.showToast(`Stock updated for "${product.name}"`, 'success');
            }
        } catch (error) {
            console.error('❌ Error updating stock:', error);
            this.showToast('Failed to update stock', 'error');
        }
    }
    
    async toggleProductStatus(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const newStatus = product.isActive === false ? true : false;
        const action = newStatus ? 'activate' : 'deactivate';
        
        if (!confirm(`Are you sure you want to ${action} "${product.name}"?`)) {
            return;
        }
        
        try {
            // Update in Firebase
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await update(productRef, { 
                    isActive: newStatus,
                    updatedAt: Date.now()
                });
                
                // Update local data
                product.isActive = newStatus;
                product.updatedAt = Date.now();
                
                // Refresh catalog
                this.applyFilters();
                
                this.showToast(`Product ${action}d successfully`, 'success');
            }
        } catch (error) {
            console.error('❌ Error updating product status:', error);
            this.showToast('Failed to update product status', 'error');
        }
    }
    
    openAddProductModal() {
        // Open existing product add modal
        if (window.productManager) {
            window.productManager.createProductModal();
        } else {
            // Load product manager for CRUD operations
            this.loadProductManagerForCRUD();
        }
    }
    
    loadProductManagerForCRUD() {
        // Load product manager only for CRUD operations
        if (!window.productManager) {
            const script = document.createElement('script');
            script.src = 'js/product-management.js';
            script.onload = () => {
                console.log('✅ Product Manager loaded for CRUD operations');
                // Set up refresh callback
                if (window.productManager) {
                    window.productManager.onProductSaved = () => {
                        this.refreshCatalog();
                    };
                    // Now open the add modal
                    window.productManager.createProductModal();
                }
            };
            document.head.appendChild(script);
        }
    }
    
    async refreshCatalog() {
        console.log('🔄 Refreshing product catalog after CRUD operation...');
        await this.loadProductCatalog();
        this.showToast('Product catalog updated', 'success');
    }
    
    // ===================================
    // UI STATE MANAGEMENT
    // ===================================
    
    showLoadingState() {
        const loadingState = document.getElementById('productsLoading');
        const emptyState = document.getElementById('productsEmpty');
        const productList = document.getElementById('productList');
        
        if (loadingState) {
            loadingState.style.display = 'flex';
            loadingState.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <span>Loading product catalog...</span>
            `;
        }
        if (emptyState) emptyState.style.display = 'none';
        if (productList) productList.style.display = 'none';
        
        console.log('📦 Loading state shown');
    }
    
    showEmptyState() {
        const loadingState = document.getElementById('productsLoading');
        const emptyState = document.getElementById('productsEmpty');
        const productList = document.getElementById('productList');
        
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <i class="fas fa-box-open"></i>
                <h3>No products found</h3>
                <p>Products will appear here when they are added to the website</p>
            `;
        }
        if (productList) productList.style.display = 'none';
        
        console.log('📦 Empty state shown');
    }
    
    showErrorState(error) {
        const loadingState = document.getElementById('productsLoading');
        const emptyState = document.getElementById('productsEmpty');
        const productList = document.getElementById('productList');
        
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading products</h3>
                <p>${error.message || 'Failed to load product catalog'}</p>
                <button class="btn btn-primary" onclick="window.mainProductCatalog.loadProductCatalog()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            `;
        }
        if (productList) productList.style.display = 'none';
        
        console.log('📦 Error state shown:', error);
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard && window.dashboard.showToast) {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // ===================================
    // CLEANUP
    // ===================================
    
    destroy() {
        // Stop auto-sync
        this.stopAutoSync();
        
        // Clear event listeners
        // (Event listeners are attached to DOM elements, will be cleaned up automatically)
        
        console.log('📦 Main Product Catalog destroyed');
    }
}

// ===================================
// INITIALIZATION
// ===================================

// Manual initialization - will be initialized when needed
console.log('📦 Main Product Catalog System loaded (not initialized yet)');
