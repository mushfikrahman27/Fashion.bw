/* ===================================
   PRODUCT MANAGEMENT SYSTEM - CONNECTED TO WEBSITE DATA SOURCE
   =================================== */

class ProductManager {
    constructor() {
        // Product data
        this.products = [];
        this.filteredProducts = [];
        this.currentEditingProduct = null;
        this.selectedImageFile = null;
        
        // Subcategory mapping
        this.subcategories = {
            'Women': ['Bags', 'Dress', 'Shoes', 'Sweater', 'Tshirt'],
            'Men': ['Sneakers', 'Shoes', 'Shirt', 'Shorts', 'Hoodie'],
            'Collection': ['Sunglasses', 'Watches', 'Belts', 'Wallet', 'Caps']
        };
        
        // Initialize
        this.init();
    }
    
    // ===================================
    // INITIALIZATION
    // ===================================
    
    init() {
        this.setupEventListeners();
        console.log('📦 Product Manager initialized');
    }
    
    setupEventListeners() {
        // Product form events
        document.getElementById('productCategory')?.addEventListener('change', (e) => {
            this.updateSubcategoryOptions(e.target.value);
        });
        
        document.getElementById('productImage')?.addEventListener('change', (e) => {
            this.handleImageSelect(e.target.files[0]);
        });
        
        document.getElementById('imageUploadArea')?.addEventListener('click', () => {
            document.getElementById('productImage')?.click();
        });
        
        document.getElementById('removeImageBtn')?.addEventListener('click', () => {
            this.removeSelectedImage();
        });
        
        document.getElementById('saveProductBtn')?.addEventListener('click', () => {
            this.saveProduct();
        });
        
        // Search and filter events
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('productCategoryFilter')?.addEventListener('change', () => {
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
    }
    
    // ===================================
    // DATA SOURCE CONNECTION
    // ===================================
    
    async loadProducts() {
        try {
            console.log('🔄 Loading products from website data source...');
            
            // Check if Firebase is available (from website)
            if (window.firebaseDB) {
                await this.loadProductsFromFirebase();
            } else {
                // Fallback to hardcoded products if Firebase not available
                await this.loadFallbackProducts();
            }
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showToast('Failed to load products', 'error');
        }
    }
    
    async loadProductsFromFirebase() {
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const productsRef = ref(window.firebaseDB, 'products');
            const snapshot = await get(productsRef);
            
            if (snapshot.exists()) {
                const firebaseProducts = snapshot.val();
                this.products = Object.values(firebaseProducts).filter(product => product.isActive !== false);
                console.log(`✅ Loaded ${this.products.length} products from Firebase`);
            } else {
                console.log('⚠️ No products found in Firebase, using fallback');
                await this.loadFallbackProducts();
            }
            
            this.applyFilters();
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            await this.loadFallbackProducts();
        }
    }
    
    async loadFallbackProducts() {
        // Use the same fallback products as website
        this.products = [
            { id: 1, name: "Luxury Tote Bag", price: "750", color: "Black", img: "bag1.jpg", category: "Women", subCategory: "Bags", stock: 15, status: "active", isActive: true },
            { id: 2, name: "Premium Handbag", price: "950", color: "Brown", img: "bag2.jpg", category: "Women", subCategory: "Bags", stock: 12, status: "active", isActive: true },
            { id: 3, name: "Urban Street Sneaker", price: "1800", color: "White/Grey", img: "sneaker1.jpg", category: "Men", subCategory: "Sneakers", stock: 8, status: "active", isActive: true },
            { id: 4, name: "Classic Sport Sneaker", price: "2200", color: "Blue", img: "sneaker2.jpg", category: "Men", subCategory: "Sneakers", stock: 6, status: "active", isActive: true },
            { id: 5, name: "Dark Aviator", price: "1200", color: "Silver", img: "glass1.jpg", category: "Men", subCategory: "Sunglasses", stock: 20, status: "active", isActive: true },
            { id: 6, name: "Smart Analog Watch", price: "3200", color: "Silver", img: "watch1.jpg", category: "Collection", subCategory: "Watches", stock: 4, status: "active", isActive: true },
            { id: 7, name: "Classic Leather Belt", price: "850", color: "Brown", img: "belt1.jpg", category: "Collection", subCategory: "Belts", stock: 25, status: "active", isActive: true },
            { id: 8, name: "Women Fashion Sandal", price: "1450", color: "Beige", img: "sandal1.jpg", category: "Women", subCategory: "Shoes", stock: 10, status: "active", isActive: true }
        ];
        
        console.log(`📦 Loaded ${this.products.length} fallback products`);
        this.applyFilters();
    }
    
    // ===================================
    // SEARCH AND FILTER SYSTEM
    // ===================================
    
    handleSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.applyFilters();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        this.filteredProducts = this.products.filter(product => {
            // Search in multiple fields for better matching
            return (
                (product.name && product.name.toLowerCase().includes(searchLower)) ||
                (product.category && product.category.toLowerCase().includes(searchLower)) ||
                (product.subCategory && product.subCategory.toLowerCase().includes(searchLower)) ||
                (product.color && product.color.toLowerCase().includes(searchLower))
            );
        });
        
        this.renderProducts();
        console.log(`🔍 Search results: ${this.filteredProducts.length} products for "${searchTerm}"`);
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('productCategoryFilter')?.value || '';
        const subCategoryFilter = document.getElementById('productSubCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('productStatusFilter')?.value || '';
        const stockFilter = document.getElementById('productStockFilter')?.value || '';
        
        this.filteredProducts = this.products.filter(product => {
            // Category filter
            if (categoryFilter && product.category !== categoryFilter) {
                return false;
            }
            
            // Subcategory filter
            if (subCategoryFilter && product.subCategory !== subCategoryFilter) {
                return false;
            }
            
            // Status filter
            if (statusFilter && product.status !== statusFilter) {
                return false;
            }
            
            // Stock filter
            if (stockFilter) {
                const stock = parseInt(product.stock) || 0;
                switch (stockFilter) {
                    case 'in_stock':
                        if (stock <= 0) return false;
                        break;
                    case 'low_stock':
                        if (stock > 10 || stock <= 0) return false;
                        break;
                    case 'out_of_stock':
                        if (stock > 0) return false;
                        break;
                }
            }
            
            return true;
        });
        
        this.renderProducts();
    }
    
    // ===================================
    // PRODUCT RENDERING
    // ===================================
    
    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        const emptyState = document.getElementById('productsEmpty');
        const loadingState = document.getElementById('productsLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = this.filteredProducts.map(product => `
            <tr>
                <td>
                    <img src="${this.getProductImageUrl(product)}" alt="${product.name}" class="product-thumbnail">
                </td>
                <td>
                    <div class="product-name-cell">${product.name}</div>
                    <div class="product-sku-cell">SKU: ${product.id || 'N/A'}</div>
                </td>
                <td>
                    <span class="category-badge ${product.category.toLowerCase()}">${product.category}</span>
                </td>
                <td>
                    <div class="price-display">$${product.price}</div>
                </td>
                <td>
                    <span class="stock-badge ${this.getStockBadgeClass(product.stock)}">
                        ${product.stock} in stock
                    </span>
                </td>
                <td>
                    <span class="status-pill ${product.status}">
                        ${product.status}
                    </span>
                </td>
                <td>
                    ${product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}
                </td>
                <td>
                    <div class="product-actions">
                        <button class="quick-action-btn edit" onclick="productManager.editProduct('${product.id}')" title="Edit Product">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="quick-action-btn stock" onclick="productManager.quickUpdateStock('${product.id}')" title="Quick Stock Update">
                            <i class="fas fa-box"></i>
                        </button>
                        <button class="quick-action-btn delete" onclick="productManager.deleteProduct('${product.id}')" title="Delete Product">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    getProductImageUrl(product) {
        // Handle different image field names for compatibility
        if (product.imgUrl) return product.imgUrl;
        if (product.img) return product.img;
        if (product.image) return product.image;
        return 'https://via.placeholder.com/60x60';
    }
    
    getStockBadgeClass(stock) {
        const stockLevel = parseInt(stock) || 0;
        if (stockLevel === 0) return 'out-of-stock';
        if (stockLevel < 10) return 'low-stock';
        return 'in-stock';
    }
    
    // ===================================
    // PRODUCT ADD/EDIT SYSTEM
    // ===================================
    
    openProductModal(product = null) {
        this.currentEditingProduct = product;
        const modal = document.getElementById('productModal');
        const modalTitle = document.getElementById('productModalTitle');
        const form = document.getElementById('productForm');
        
        // Set modal title
        modalTitle.textContent = product ? 'Edit Product' : 'Add Product';
        
        // Reset form
        form.reset();
        this.removeSelectedImage();
        
        if (product) {
            // Pre-fill form for editing
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productColor').value = product.color || '';
            document.getElementById('productSize').value = product.size || '';
            document.getElementById('productStock').value = product.stock || '';
            document.getElementById('productStatus').value = product.status || 'active';
            document.getElementById('productDescription').value = product.description || '';
            
            // Update subcategory options
            this.updateSubcategoryOptions(product.category || '');
            
            // Set subcategory value
            if (product.subCategory) {
                setTimeout(() => {
                    document.getElementById('productSubCategory').value = product.subCategory;
                }, 100);
            }
            
            // Show existing image
            if (product.img || product.imgUrl) {
                this.showImagePreview(this.getProductImageUrl(product));
            }
        } else {
            // Set up for adding new product
            this.updateSubcategoryOptions('');
        }
        
        // Show modal
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeProductModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('productModal').style.display = 'none';
            this.currentEditingProduct = null;
            this.selectedImageFile = null;
        }, 300);
    }
    
    updateSubcategoryOptions(category) {
        const subcategorySelect = document.getElementById('productSubCategory');
        const currentValue = subcategorySelect.value;
        
        // Clear existing options
        subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
        
        if (category && this.subcategories[category]) {
            this.subcategories[category].forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = sub;
                subcategorySelect.appendChild(option);
            });
        }
        
        // Restore previous value if it still exists
        if (currentValue && this.subcategories[category]?.includes(currentValue)) {
            subcategorySelect.value = currentValue;
        }
    }
    
    // ===================================
    // IMAGE HANDLING
    // ===================================
    
    handleImageSelect(file) {
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Image size should be less than 5MB', 'error');
            return;
        }
        
        this.selectedImageFile = file;
        this.showImagePreview(URL.createObjectURL(file));
    }
    
    showImagePreview(imageUrl) {
        const placeholder = document.getElementById('imageUploadPlaceholder');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        
        if (placeholder) placeholder.style.display = 'none';
        if (preview) {
            preview.style.display = 'block';
            if (previewImg) previewImg.src = imageUrl;
        }
    }
    
    removeSelectedImage() {
        this.selectedImageFile = null;
        const placeholder = document.getElementById('imageUploadPlaceholder');
        const preview = document.getElementById('imagePreview');
        
        if (placeholder) placeholder.style.display = 'flex';
        if (preview) {
            preview.style.display = 'none';
            const previewImg = document.getElementById('previewImg');
            if (previewImg) previewImg.src = '';
        }
        
        // Clear file input
        const fileInput = document.getElementById('productImage');
        if (fileInput) fileInput.value = '';
    }
    
    // ===================================
    // SAVE/UPDATE/DELETE OPERATIONS
    // ===================================
    
    async saveProduct() {
        try {
            const form = document.getElementById('productForm');
            if (!form.checkValidity()) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Collect form data
            const productData = {
                name: document.getElementById('productName').value.trim(),
                category: document.getElementById('productCategory').value,
                subCategory: document.getElementById('productSubCategory').value || '',
                price: document.getElementById('productPrice').value,
                color: document.getElementById('productColor').value.trim(),
                size: document.getElementById('productSize').value.trim(),
                stock: parseInt(document.getElementById('productStock').value) || 0,
                status: document.getElementById('productStatus').value,
                description: document.getElementById('productDescription').value.trim(),
                isActive: document.getElementById('productStatus').value === 'active',
                updatedAt: Date.now()
            };
            
            // Handle image
            if (this.selectedImageFile) {
                productData.img = await this.uploadImage(this.selectedImageFile);
            } else if (this.currentEditingProduct) {
                // Keep existing image if not editing
                productData.img = this.currentEditingProduct.img || this.currentEditingProduct.imgUrl;
            }
            
            // Save to Firebase
            if (window.firebaseDB) {
                await this.saveToFirebase(productData);
            } else {
                // Fallback to local storage
                await this.saveToLocal(productData);
            }
            
            // Update local data
            if (this.currentEditingProduct) {
                // Update existing product
                const index = this.products.findIndex(p => p.id === this.currentEditingProduct.id);
                if (index !== -1) {
                    this.products[index] = { ...this.currentEditingProduct, ...productData };
                }
            } else {
                // Add new product
                const newProduct = {
                    id: Date.now().toString(),
                    ...productData,
                    createdAt: Date.now()
                };
                this.products.push(newProduct);
            }
            
            // Refresh display
            this.applyFilters();
            this.closeProductModal();
            
            this.showToast(
                this.currentEditingProduct ? 'Product updated successfully' : 'Product added successfully',
                'success'
            );
            
        } catch (error) {
            console.error('❌ Error saving product:', error);
            this.showToast('Failed to save product', 'error');
        } finally {
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Product';
        }
    }
    
    async saveToFirebase(productData) {
        const { ref, push, update, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        if (this.currentEditingProduct) {
            // Update existing product
            const productRef = ref(window.firebaseDB, `products/${this.currentEditingProduct.id}`);
            await update(productRef, productData);
            console.log('✅ Product updated in Firebase:', productData.name);
        } else {
            // Add new product
            const productsRef = ref(window.firebaseDB, 'products');
            const newProductRef = push(productsRef);
            await set(newProductRef, productData);
            console.log('✅ Product added to Firebase:', productData.name);
        }
    }
    
    async saveToLocal(productData) {
        // Fallback for when Firebase is not available
        console.log('⚠️ Firebase not available, saving locally');
        
        if (this.currentEditingProduct) {
            const index = this.products.findIndex(p => p.id === this.currentEditingProduct.id);
            if (index !== -1) {
                this.products[index] = { ...this.currentEditingProduct, ...productData };
            }
        } else {
            const newProduct = {
                id: Date.now().toString(),
                ...productData,
                createdAt: Date.now()
            };
            this.products.push(newProduct);
        }
        
        // Save to localStorage as fallback
        localStorage.setItem('admin_products', JSON.stringify(this.products));
    }
    
    async uploadImage(file) {
        try {
            // For now, return a placeholder URL
            // In production, this would upload to Firebase Storage
            console.log('📤 Uploading image:', file.name);
            
            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Return the filename (in production, this would be the Firebase Storage URL)
            return file.name;
            
        } catch (error) {
            console.error('❌ Image upload failed:', error);
            throw error;
        }
    }
    
    editProduct(productId) {
        const product = this.products.find(p => p.id == productId);
        if (product) {
            this.openProductModal(product);
        } else {
            this.showToast('Product not found', 'error');
        }
    }
    
    quickUpdateStock(productId) {
        const product = this.products.find(p => p.id == productId);
        if (product) {
            const newStock = prompt(`Update stock for "${product.name}" (current: ${product.stock}):`, product.stock);
            if (newStock !== null && !isNaN(newStock)) {
                this.updateProductStock(productId, parseInt(newStock));
            }
        }
    }
    
    async updateProductStock(productId, newStock) {
        try {
            const product = this.products.find(p => p.id == productId);
            if (!product) return;
            
            product.stock = newStock;
            product.updatedAt = Date.now();
            
            // Save to Firebase
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await update(productRef, { stock: newStock, updatedAt: Date.now() });
            }
            
            this.applyFilters();
            this.showToast(`Stock updated for ${product.name}`, 'success');
            
        } catch (error) {
            console.error('❌ Error updating stock:', error);
            this.showToast('Failed to update stock', 'error');
        }
    }
    
    async deleteProduct(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;
        
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }
        
        try {
            // Delete from Firebase
            if (window.firebaseDB) {
                const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const productRef = ref(window.firebaseDB, `products/${productId}`);
                await remove(productRef);
                console.log('✅ Product deleted from Firebase:', product.name);
            }
            
            // Remove from local array
            this.products = this.products.filter(p => p.id != productId);
            
            this.applyFilters();
            this.showToast(`Product "${product.name}" deleted`, 'success');
            
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            this.showToast('Failed to delete product', 'error');
        }
    }
    
    // ===================================
    // UTILITY METHODS
    // ===================================
    
    showToast(message, type = 'info', title = '') {
        // Use the main dashboard's toast system
        if (window.dashboard) {
            window.dashboard.showToast(message, type, title);
        } else {
            // Fallback toast
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// ===================================
// INITIALIZATION
// ===================================

// Initialize product manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.productManager = new ProductManager();
    console.log('🎉 Product Management System ready - Connected to website data source');
});
