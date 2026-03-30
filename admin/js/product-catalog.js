/* ===================================
   CENTRAL PRODUCT CATALOG SYSTEM
   Auto-synced with website product source
   =================================== */

class ProductCatalog {
    constructor() {
        // Product data from website source
        this.products = [];
        this.filteredProducts = [];
        
        // Auto-sync settings
        this.autoRefreshInterval = null;
        this.lastSyncTime = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('📦 Product Catalog initialized - auto-sync enabled');
    }
    
    // ===================================
    // EVENT LISTENERS
    // ===================================
    
    setupEventListeners() {
        // Search and filters
        document.getElementById('catalogSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('catalogCategoryFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('catalogStatusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('catalogStockFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Action buttons
        document.getElementById('addProductFromCatalogBtn')?.addEventListener('click', () => {
            this.openAddProductModal();
        });
        
        document.getElementById('refreshCatalogBtn')?.addEventListener('click', () => {
            this.refreshCatalog();
        });
    }
    
    // ===================================
    // REAL DATA SOURCE CONNECTION
    // ===================================
    
    async loadCatalog() {
        try {
            console.log('🔄 Loading product catalog from website data source...');
            
            // Show loading state
            this.showLoadingState();
            
            // Load from the same Firebase source used by website
            if (window.firebaseDB) {
                await this.loadFromFirebase();
            } else {
                // Wait for Firebase to be available
                await this.waitForFirebaseAndLoad();
            }
            
            // Apply initial filters
            this.applyFilters();
            
            // Start auto-sync
            this.startAutoSync();
            
            console.log(`✅ Product catalog loaded: ${this.products.length} products`);
            
        } catch (error) {
            console.error('❌ Error loading product catalog:', error);
            this.showEmptyState();
            this.showToast('Failed to load product catalog', 'error');
        }
    }
    
    async waitForFirebaseAndLoad() {
        // Wait for Firebase to be available (from website)
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!window.firebaseDB && attempts < maxAttempts) {
            console.log('⏳ Waiting for Firebase connection...');
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (window.firebaseDB) {
            await this.loadFromFirebase();
        } else {
            throw new Error('Firebase connection not available');
        }
    }
    
    async loadFromFirebase() {
        try {
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
                    img: product.imgUrl || product.img || 'https://via.placeholder.com/60x60',
                    stock: product.stock || 0,
                    isActive: product.isActive !== false, // Default to active unless explicitly false
                    createdAt: product.createdAt || Date.now(),
                    updatedAt: product.updatedAt || Date.now()
                }));
                
                console.log(`✅ Loaded ${this.products.length} products from Firebase`);
            } else {
                console.log('⚠️ No products found in Firebase');
                this.products = [];
            }
            
            this.lastSyncTime = Date.now();
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            throw error;
        }
    }
    
    // ===================================
    // AUTO-SYNC SYSTEM
    // ===================================
    
    startAutoSync() {
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Set up auto-refresh every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            this.autoRefreshCatalog();
        }, 30000);
        
        console.log('🔄 Auto-sync enabled (30-second intervals)');
    }
    
    stopAutoSync() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('⏹️ Auto-sync stopped');
        }
    }
    
    async autoRefreshCatalog() {
        try {
            console.log('🔄 Auto-refreshing product catalog...');
            
            // Store current products for comparison
            const previousProducts = [...this.products];
            
            // Reload from Firebase
            await this.loadFromFirebase();
            
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
        
        this.renderCatalog();
        console.log(`🔍 Catalog search results: ${this.filteredProducts.length} products for "${searchTerm}"`);
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('catalogCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('catalogStatusFilter')?.value || '';
        const stockFilter = document.getElementById('catalogStockFilter')?.value || '';
        
        // Start with all products
        this.filteredProducts = [...this.products];
        
        // Category filter
        if (categoryFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => 
                product.category === categoryFilter
            );
        }
        
        // Status filter
        if (statusFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => {
                switch (statusFilter) {
                    case 'active':
                        return product.isActive !== false && product.stock > 0;
                    case 'inactive':
                        return product.isActive === false;
                    case 'out-of-stock':
                        return product.stock <= 0;
                    default:
                        return true;
                }
            });
        }
        
        // Stock filter
        if (stockFilter) {
            this.filteredProducts = this.filteredProducts.filter(product => {
                switch (stockFilter) {
                    case 'in-stock':
                        return product.stock > 10;
                    case 'low-stock':
                        return product.stock > 0 && product.stock <= 10;
                    case 'out-of-stock':
                        return product.stock <= 0;
                    default:
                        return true;
                }
            });
        }
        
        this.renderCatalog();
    }
    
    // ===================================
    // RENDERING
    // ===================================
    
    renderCatalog() {
        const tbody = document.getElementById('catalogTableBody');
        const emptyState = document.getElementById('catalogEmpty');
        const loadingState = document.getElementById('catalogLoading');
        
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        // Hide empty state
        if (emptyState) emptyState.style.display = 'none';
        
        // Render products
        tbody.innerHTML = this.filteredProducts.map(product => `
            <tr class="catalog-row" data-product-id="${product.id}">
                <td>
                    <div class="product-cell">
                        <img src="${product.img}" alt="${product.name}" class="product-thumbnail">
                        <div class="product-info">
                            <div class="product-name">${product.name}</div>
                            <div class="product-details">${product.color} • ${product.subCategory || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge ${product.category.toLowerCase()}">${product.category}</span>
                </td>
                <td>
                    <div class="price-cell">$${product.price.toFixed(2)}</div>
                </td>
                <td>
                    <span class="stock-badge ${this.getStockClass(product.stock)}">${product.stock} units</span>
                </td>
                <td>
                    <span class="status-badge ${product.isActive !== false ? 'active' : 'inactive'}">
                        ${product.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="date-cell">${new Date(product.updatedAt).toLocaleDateString()}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="productCatalog.editProduct('${product.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="productCatalog.quickStockUpdate('${product.id}')" title="Quick Stock">
                            <i class="fas fa-boxes"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="productCatalog.toggleProductStatus('${product.id}')" title="${product.isActive !== false ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${product.isActive !== false ? 'eye-slash' : 'eye'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
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
            this.showToast('Product management system loading...', 'info');
        }
    }
    
    async refreshCatalog() {
        try {
            console.log('🔄 Manual refresh requested...');
            
            // Show loading state
            this.showLoadingState();
            
            // Reload from Firebase
            await this.loadFromFirebase();
            
            // Apply filters
            this.applyFilters();
            
            this.showToast('Product catalog refreshed', 'success');
            
        } catch (error) {
            console.error('❌ Manual refresh failed:', error);
            this.showToast('Failed to refresh catalog', 'error');
        }
    }
    
    // ===================================
    // UI STATE MANAGEMENT
    // ===================================
    
    showLoadingState() {
        const loadingState = document.getElementById('catalogLoading');
        const emptyState = document.getElementById('catalogEmpty');
        const tbody = document.getElementById('catalogTableBody');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        if (tbody) tbody.innerHTML = '';
    }
    
    showEmptyState() {
        const loadingState = document.getElementById('catalogLoading');
        const emptyState = document.getElementById('catalogEmpty');
        const tbody = document.getElementById('catalogTableBody');
        
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        if (tbody) tbody.innerHTML = '';
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard) {
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
        
        console.log('📦 Product Catalog destroyed');
    }
}

// ===================================
// INITIALIZATION
// ===================================

// Initialize product catalog when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.productCatalog = new ProductCatalog();
    console.log('🎉 Central Product Catalog System ready');
});
