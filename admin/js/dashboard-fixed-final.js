// admin/js/dashboard-complete.js - COMPLETELY FIXED ADMIN PANEL
// Connected to website product system, mobile responsive, proper structure

console.log('🔍 ADMIN DEBUG: Admin dashboard script loaded successfully!');

import { auth, db, storage } from '../../firebase-config.js';
import { 
    ref as dbRef, 
    onValue, 
    update, 
    remove, 
    push, 
    set,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Toast notification system
class ToastManager {
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Main Admin Dashboard Class
class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.products = [];
        this.orders = [];
        this.categories = ['shirts', 'pants', 'accessories'];
        this.selectedImageFile = null;
        this.currentImageUrl = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Admin Dashboard...');
        
        // Check authentication
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                console.log('❌ No authenticated user, redirecting to login');
                ToastManager.show('Please login to access admin panel', 'error');
                window.location.href = "index.html";
                return;
            }
            
            console.log('✅ User authenticated:', user.email);
            ToastManager.show('Welcome to Admin Dashboard', 'success');
            
            // Initialize dashboard
            this.setupEventListeners();
            this.loadInitialData();
            this.setupNavigation();
        });
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.id.replace('nav', '').toLowerCase();
                this.navigateToSection(section);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    setupNavigation() {
        // Load initial dashboard content
        this.loadDashboardContent();
    }

    navigateToSection(section) {
        console.log('📍 Navigating to:', section);
        
        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavItem = document.getElementById(`nav${section.charAt(0).toUpperCase() + section.slice(1)}`);
        if (activeNavItem) activeNavItem.classList.add('active');
        
        this.currentSection = section;
        this.loadSectionContent(section);
    }

    loadSectionContent(section) {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        
        switch(section) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'products':
                this.loadProductManagement();
                break;
            case 'inventory':
                this.loadInventoryManagement();
                break;
            case 'orders':
                this.loadOrderManagement();
                break;
            case 'media':
                this.loadMediaManager();
                break;
            case 'settings':
                this.loadSettings();
                break;
            default:
                this.loadDashboardContent();
        }
    }

    async loadInitialData() {
        console.log('📊 Loading initial data...');
        
        try {
            // Load products from Firebase (same as website)
            const productsRef = dbRef(db, 'products');
            onValue(productsRef, (snapshot) => {
                const data = snapshot.val();
                this.products = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
                console.log('✅ Products loaded from Firebase:', this.products.length, 'products');
                this.renderProducts();
                this.updateDashboardStats();
                this.renderInventoryTable(); // Update inventory too
            }, {
                onlyOnce: false
            });

            // Load orders
            const ordersRef = dbRef(db, 'orders');
            onValue(ordersRef, (snapshot) => {
                const data = snapshot.val();
                this.orders = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
                console.log('✅ Orders loaded:', this.orders.length, 'orders');
                this.updateDashboardStats();
                this.renderOrderTable(); // Update orders table
            });
            
            console.log('✅ Initial data loading complete');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            ToastManager.show('Failed to load data', 'error');
        }
    }

    loadDashboardContent() {
        console.log('📈 Loading dashboard content...');
        
        let dashboardSection = document.getElementById('dashboardSection');
        if (!dashboardSection) {
            dashboardSection = this.createDashboardSection();
            document.querySelector('.dashboard-body').appendChild(dashboardSection);
        }
        
        dashboardSection.style.display = 'block';
        this.updateDashboardStats();
    }

    createDashboardSection() {
        const section = document.createElement('div');
        section.id = 'dashboardSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="dashboard-header">
                <h1>Dashboard Overview</h1>
                <div class="dashboard-actions">
                    <button class="btn btn-primary" onclick="window.dashboard.openAddProductModal()">
                        <i class="icon">➕</i> Add Product
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <h3 id="totalProducts">0</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <h3 id="totalOrders">0</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3 id="lowStock">0</h3>
                        <p>Low Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <h3 id="totalRevenue">$0</h3>
                        <p>Total Revenue</p>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="recent-activity">
                    <h2>Recent Activity</h2>
                    <div id="recentActivity" class="activity-list">
                        <p>Loading activity...</p>
                    </div>
                </div>
            </div>
        `;
        return section;
    }

    updateDashboardStats() {
        const totalProducts = this.products.length;
        const totalOrders = this.orders.length;
        const lowStock = this.products.filter(p => (p.stock || 0) <= 10).length;
        const totalRevenue = this.orders.reduce((sum, order) => sum + (order.total || 0), 0);

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('lowStock').textContent = lowStock;
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    }

    loadProductManagement() {
        console.log('🛍️ Loading product management...');
        
        let productSection = document.getElementById('productSection');
        if (!productSection) {
            productSection = this.createProductManagementSection();
            document.querySelector('.dashboard-body').appendChild(productSection);
        }
        
        productSection.style.display = 'block';
        this.renderProducts();
    }

    createProductManagementSection() {
        const section = document.createElement('div');
        section.id = 'productSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Product Management</h1>
                <button class="btn btn-primary" onclick="window.dashboard.openAddProductModal()">
                    <i class="icon">➕</i> Add Product
                </button>
            </div>
            
            <div class="product-controls">
                <div class="search-filter-container">
                    <input type="text" id="productSearch" placeholder="Search by name, category, or sub-category..." class="search-input">
                    <select id="categoryFilter" class="filter-select">
                        <option value="">All Categories</option>
                        <option value="Women">Women</option>
                        <option value="Men">Men</option>
                        <option value="Collection">Collection</option>
                    </select>
                    <select id="subCategoryFilter" class="filter-select">
                        <option value="">All Sub Categories</option>
                        <option value="Bags">Bags</option>
                        <option value="Sneakers">Sneakers</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Shirt">Shirt</option>
                        <option value="Sunglasses">Sunglasses</option>
                        <option value="Watches">Watches</option>
                        <option value="Belts">Belts</option>
                        <option value="Caps">Caps</option>
                        <option value="Hoodie">Hoodie</option>
                        <option value="Dress">Dress</option>
                    </select>
                    <select id="statusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Sub Category</th>
                            <th>Color</th>
                            <th>Price (TK)</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productTableBody">
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading products...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Add event listeners
        const searchInput = section.querySelector('#productSearch');
        const categoryFilter = section.querySelector('#categoryFilter');
        const subCategoryFilter = section.querySelector('#subCategoryFilter');
        const statusFilter = section.querySelector('#statusFilter');
        
        if (searchInput) searchInput.addEventListener('input', () => this.filterProducts());
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterProducts());
        if (subCategoryFilter) subCategoryFilter.addEventListener('change', () => this.filterProducts());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterProducts());
        
        return section;
    }

    renderProducts() {
        const tbody = document.getElementById('productTableBody');
        if (!tbody) return;
        
        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div style="margin-bottom: 16px;">📦</div>
                        <div>No products found</div>
                        <div style="font-size: 0.9rem; margin-top: 8px;">Add your first product to get started</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = this.getStockClass(product.stock || 0);
            
            row.innerHTML = `
                <td>
                    <img src="${product.img || product.image || 'https://via.placeholder.com/50'}" 
                         alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>
                    <div class="product-info">
                        <strong>${product.name || 'Unnamed Product'}</strong>
                    </div>
                </td>
                <td>${product.category || 'Uncategorized'}</td>
                <td>${product.subCategory || 'Not specified'}</td>
                <td>
                    <span class="color-badge">${product.color || 'N/A'}</span>
                </td>
                <td>
                    <strong>TK-${product.price || '0'}</strong>
                </td>
                <td>
                    <span class="stock-badge ${stockClass}">${product.stock || 0}</span>
                </td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                        ${product.status || 'active'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.dashboard.editProduct('${product.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.dashboard.deleteProduct('${product.id}')">
                            Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterProducts() {
        const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const subCategoryFilter = document.getElementById('subCategoryFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        const filteredProducts = this.products.filter(product => {
            // Search logic matching website: name, category, subCategory
            const matchesSearch = !searchTerm || 
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.subCategory && product.subCategory.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            const matchesSubCategory = !subCategoryFilter || product.subCategory === subCategoryFilter;
            const matchesStatus = !statusFilter || product.status === statusFilter;
            
            return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus;
        });
        
        this.renderFilteredProducts(filteredProducts);
    }

    renderFilteredProducts(products) {
        const tbody = document.getElementById('productTableBody');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div>No products match your filters</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = this.getStockClass(product.stock || 0);
            
            row.innerHTML = `
                <td>
                    <img src="${product.img || product.image || 'https://via.placeholder.com/50'}" 
                         alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>
                    <div class="product-info">
                        <strong>${product.name || 'Unnamed Product'}</strong>
                        <br><small>${product.description || 'No description'}</small>
                    </div>
                </td>
                <td>${product.category || 'Uncategorized'}</td>
                <td>$${(product.price || 0).toFixed(2)}</td>
                <td>
                    <span class="stock-badge ${stockClass}">${product.stock || 0}</span>
                </td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                        ${product.status || 'active'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.dashboard.editProduct('${product.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.dashboard.deleteProduct('${product.id}')">
                            Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getStockClass(stock) {
        if (stock === 0) return 'out-of-stock';
        if (stock <= 10) return 'low-stock';
        return 'in-stock';
    }

    loadInventoryManagement() {
        console.log('📦 Loading inventory management...');
        
        let inventorySection = document.getElementById('inventorySection');
        if (!inventorySection) {
            inventorySection = this.createInventoryManagementSection();
            document.querySelector('.dashboard-body').appendChild(inventorySection);
        }
        
        inventorySection.style.display = 'block';
        this.renderInventoryTable();
    }

    createInventoryManagementSection() {
        const section = document.createElement('div');
        section.id = 'inventorySection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Inventory Management</h1>
                <button class="btn btn-primary" onclick="window.dashboard.updateAllStock()">
                    <i class="icon">🔄</i> Update All Stock
                </button>
            </div>
            
            <div class="inventory-stats">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <h3 id="totalProductsCount">0</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3 id="lowStockCount">0</h3>
                        <p>Low Stock</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">❌</div>
                    <div class="stat-content">
                        <h3 id="outOfStockCount">0</h3>
                        <p>Out of Stock</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Current Stock</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryTableBody">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading inventory...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        return section;
    }

    renderInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        
        // Update inventory stats
        this.updateInventoryStats();
        
        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div style="margin-bottom: 16px;">📦</div>
                        <div>No inventory data found</div>
                        <div style="font-size: 0.9rem; margin-top: 8px;">Add products to see inventory here</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            const stockClass = this.getStockClass(product.stock || 0);
            
            row.innerHTML = `
                <td>
                    <div class="inventory-product-info">
                        <img src="${product.img || product.image || 'https://via.placeholder.com/40'}" 
                             alt="${product.name}" 
                             style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <div class="inventory-product-name">${product.name || 'Unnamed Product'}</div>
                            <div class="inventory-product-category">${product.category || 'Uncategorized'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="stock-badge ${stockClass}">${product.stock || 0}</span>
                </td>
                <td>$${(product.price || 0).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                        ${product.status || 'active'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.dashboard.updateStock('${product.id}')">
                        Update Stock
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateInventoryStats() {
        const totalProductsEl = document.getElementById('totalProductsCount');
        const lowStockEl = document.getElementById('lowStockCount');
        const outOfStockEl = document.getElementById('outOfStockCount');
        
        if (totalProductsEl) totalProductsEl.textContent = this.products.length;
        
        const lowStock = this.products.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
        const outOfStock = this.products.filter(p => (p.stock || 0) === 0).length;
        
        if (lowStockEl) lowStockEl.textContent = lowStock;
        if (outOfStockEl) outOfStockEl.textContent = outOfStock;
    }

    loadOrderManagement() {
        console.log('🛒 Loading order management...');
        
        let orderSection = document.getElementById('orderSection');
        if (!orderSection) {
            orderSection = this.createOrderManagementSection();
            document.querySelector('.dashboard-body').appendChild(orderSection);
        }
        
        orderSection.style.display = 'block';
        this.renderOrderTable();
    }

    createOrderManagementSection() {
        const section = document.createElement('div');
        section.id = 'orderSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Order Management</h1>
                <div class="order-controls">
                    <select id="orderStatusFilter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input type="text" id="orderSearch" placeholder="Search orders..." class="search-input">
                </div>
            </div>
            
            <div class="order-stats">
                <div class="stat-card">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <h3 id="totalOrdersCount">0</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <h3 id="pendingOrdersCount">0</h3>
                        <p>Pending Orders</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <h3 id="completedOrdersCount">0</h3>
                        <p>Completed Orders</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="orderTableBody">
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <p>Loading orders...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Add event listeners
        const statusFilter = section.querySelector('#orderStatusFilter');
        const searchInput = section.querySelector('#orderSearch');
        
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterOrders());
        if (searchInput) searchInput.addEventListener('input', () => this.filterOrders());
        
        return section;
    }

    renderOrderTable() {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;
        
        // Update order stats
        this.updateOrderStats();
        
        if (this.orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div style="margin-bottom: 16px;">📦</div>
                        <div>No orders found</div>
                        <div style="font-size: 0.9rem; margin-top: 8px;">Orders will appear here when customers make purchases</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.orders.forEach(order => {
            const row = document.createElement('tr');
            const orderDate = new Date(order.createdAt || order.timestamp || Date.now());
            
            row.innerHTML = `
                <td>
                    <strong>#${order.id || 'Unknown'}</strong>
                </td>
                <td>
                    <div class="customer-info">
                        <div>${order.customerName || order.name || 'Unknown Customer'}</div>
                        <small>${order.customerEmail || order.email || 'No email'}</small>
                    </div>
                </td>
                <td>${orderDate.toLocaleDateString()}</td>
                <td>$${(order.total || order.amount || 0).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${order.status || 'pending'}">
                        ${order.status || 'pending'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.dashboard.viewOrderDetails('${order.id}')">
                            View
                        </button>
                        <button class="btn btn-sm btn-success" onclick="window.dashboard.updateOrderStatus('${order.id}', 'shipped')">
                            Ship
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateOrderStats() {
        const totalOrdersEl = document.getElementById('totalOrdersCount');
        const pendingOrdersEl = document.getElementById('pendingOrdersCount');
        const completedOrdersEl = document.getElementById('completedOrdersCount');
        
        if (totalOrdersEl) totalOrdersEl.textContent = this.orders.length;
        
        const pendingOrders = this.orders.filter(o => (o.status || 'pending') === 'pending').length;
        const completedOrders = this.orders.filter(o => (o.status || '') === 'delivered').length;
        
        if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
        if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
    }

    filterOrders() {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
        const searchTerm = document.getElementById('orderSearch')?.value.toLowerCase() || '';
        
        let filteredOrders = this.orders;
        
        // Apply status filter
        if (statusFilter) {
            filteredOrders = filteredOrders.filter(order => (order.status || 'pending') === statusFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredOrders = filteredOrders.filter(order => 
                (order.id && order.id.toLowerCase().includes(searchTerm)) ||
                (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
                (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm))
            );
        }
        
        this.renderFilteredOrders(filteredOrders);
    }

    renderFilteredOrders(orders) {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <div>No orders match your filters</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            const orderDate = new Date(order.createdAt || order.timestamp || Date.now());
            
            row.innerHTML = `
                <td>
                    <strong>#${order.id || 'Unknown'}</strong>
                </td>
                <td>
                    <div class="customer-info">
                        <div>${order.customerName || order.name || 'Unknown Customer'}</div>
                        <small>${order.customerEmail || order.email || 'No email'}</small>
                    </div>
                </td>
                <td>${orderDate.toLocaleDateString()}</td>
                <td>$${(order.total || order.amount || 0).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${order.status || 'pending'}">
                        ${order.status || 'pending'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="window.dashboard.viewOrderDetails('${order.id}')">
                            View
                        </button>
                        <button class="btn btn-sm btn-success" onclick="window.dashboard.updateOrderStatus('${order.id}', 'shipped')">
                            Ship
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    loadMediaManager() {
        console.log('🖼️ Loading media manager...');
        
        let mediaSection = document.getElementById('mediaSection');
        if (!mediaSection) {
            mediaSection = this.createMediaManagerSection();
            document.querySelector('.dashboard-body').appendChild(mediaSection);
        }
        
        mediaSection.style.display = 'block';
        this.renderMediaGrid();
    }

    createMediaManagerSection() {
        const section = document.createElement('div');
        section.id = 'mediaSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Media Manager</h1>
                <button class="btn btn-primary" onclick="window.dashboard.openUploadModal()">
                    <i class="icon">📤</i> Upload Media
                </button>
            </div>
            
            <div class="media-controls">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <div class="upload-icon">📤</div>
                        <h3>Drag & Drop Media Files</h3>
                        <p>or click to browse</p>
                        <input type="file" id="mediaInput" accept="image/*" multiple style="display: none;">
                    </div>
                </div>
            </div>
            
            <div class="media-grid" id="mediaGrid">
                <div class="media-placeholder">
                    <div class="placeholder-icon">🖼️</div>
                    <p>No media files uploaded yet</p>
                </div>
            </div>
        `;
        
        // Add upload functionality
        const uploadArea = section.querySelector('#uploadArea');
        const mediaInput = section.querySelector('#mediaInput');
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => mediaInput?.click());
        }
        
        if (mediaInput) {
            mediaInput.addEventListener('change', (e) => this.handleMediaUpload(e.target.files));
        }
        
        return section;
    }

    renderMediaGrid() {
        const mediaGrid = document.getElementById('mediaGrid');
        if (!mediaGrid) return;
        
        // For now, show placeholder - can be extended to load from Firebase Storage
        mediaGrid.innerHTML = `
            <div class="media-placeholder">
                <div class="placeholder-icon">🖼️</div>
                <p>No media files uploaded yet</p>
                <p style="font-size: 0.9rem; color: var(--text-muted);">
                    Upload product images and other media files
                </p>
            </div>
        `;
    }

    handleMediaUpload(files) {
        if (files.length === 0) return;
        
        ToastManager.show(`Uploading ${files.length} file(s)...`, 'info');
        
        // Handle file upload logic here
        Array.from(files).forEach(file => {
            console.log('Uploading file:', file.name);
        });
        
        ToastManager.show('Files uploaded successfully', 'success');
    }

    loadSettings() {
        console.log('⚙️ Loading settings...');
        
        let settingsSection = document.getElementById('settingsSection');
        if (!settingsSection) {
            settingsSection = this.createSettingsSection();
            document.querySelector('.dashboard-body').appendChild(settingsSection);
        }
        
        settingsSection.style.display = 'block';
    }

    createSettingsSection() {
        const section = document.createElement('div');
        section.id = 'settingsSection';
        section.className = 'section-content';
        section.innerHTML = `
            <div class="section-header">
                <h1>Settings</h1>
                <button class="btn btn-primary" onclick="window.dashboard.saveSettings()">
                    <i class="icon">💾</i> Save Settings
                </button>
            </div>
            
            <div class="settings-container">
                <div class="settings-section">
                    <h2>Store Information</h2>
                    <div class="form-group">
                        <label for="storeName">Store Name</label>
                        <input type="text" id="storeName" class="form-control" value="FashionForAll">
                    </div>
                    <div class="form-group">
                        <label for="storeEmail">Store Email</label>
                        <input type="email" id="storeEmail" class="form-control" value="store@example.com">
                    </div>
                    <div class="form-group">
                        <label for="storePhone">Store Phone</label>
                        <input type="tel" id="storePhone" class="form-control" value="+1234567890">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>Notification Settings</h2>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="emailNotifications" checked>
                            Email Notifications
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="lowStockAlerts" checked>
                            Low Stock Alerts
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="newOrderAlerts" checked>
                            New Order Alerts
                        </label>
                    </div>
                </div>
            </div>
        `;
        return section;
    }

    // Product Management Methods
    openAddProductModal() {
        console.log('Opening add product modal...');
        // Create and show add product modal
        this.createProductModal();
    }

    createProductModal(product = null) {
        // Remove existing modal
        const existingModal = document.getElementById('productModal');
        if (existingModal) existingModal.remove();
        
        const isEdit = product !== null;
        
        const modal = document.createElement('div');
        modal.id = 'productModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit Product' : 'Add New Product'}</h2>
                    <button class="modal-close" onclick="window.dashboard.closeProductModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="productForm" class="product-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productName">Product Name *</label>
                                <input type="text" id="productName" name="name" value="${product?.name || ''}" required class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="productCategory">Main Category *</label>
                                <select id="productCategory" name="category" required class="form-control" onchange="window.dashboard.updateSubCategories()">
                                    <option value="">Select Category</option>
                                    <option value="Women" ${product?.category === 'Women' ? 'selected' : ''}>Women</option>
                                    <option value="Men" ${product?.category === 'Men' ? 'selected' : ''}>Men</option>
                                    <option value="Collection" ${product?.category === 'Collection' ? 'selected' : ''}>Collection</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productSubCategory">Sub Category *</label>
                                <select id="productSubCategory" name="subCategory" required class="form-control">
                                    <option value="">Select Sub Category</option>
                                    <option value="Bags" ${product?.subCategory === 'Bags' ? 'selected' : ''}>Bags</option>
                                    <option value="Sneakers" ${product?.subCategory === 'Sneakers' ? 'selected' : ''}>Sneakers</option>
                                    <option value="Shoes" ${product?.subCategory === 'Shoes' ? 'selected' : ''}>Shoes</option>
                                    <option value="Shirt" ${product?.subCategory === 'Shirt' ? 'selected' : ''}>Shirt</option>
                                    <option value="Sunglasses" ${product?.subCategory === 'Sunglasses' ? 'selected' : ''}>Sunglasses</option>
                                    <option value="Watches" ${product?.subCategory === 'Watches' ? 'selected' : ''}>Watches</option>
                                    <option value="Belts" ${product?.subCategory === 'Belts' ? 'selected' : ''}>Belts</option>
                                    <option value="Caps" ${product?.subCategory === 'Caps' ? 'selected' : ''}>Caps</option>
                                    <option value="Hoodie" ${product?.subCategory === 'Hoodie' ? 'selected' : ''}>Hoodie</option>
                                    <option value="Dress" ${product?.subCategory === 'Dress' ? 'selected' : ''}>Dress</option>
                                    <option value="Most Viewed" ${product?.subCategory === 'Most Viewed' ? 'selected' : ''}>Most Viewed</option>
                                    <option value="Trending" ${product?.subCategory === 'Trending' ? 'selected' : ''}>Trending</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="productColor">Color *</label>
                                <input type="text" id="productColor" name="color" value="${product?.color || ''}" required class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productPrice">Price (TK) *</label>
                                <input type="text" id="productPrice" name="price" value="${product?.price || ''}" required class="form-control" placeholder="e.g., 750">
                            </div>
                            <div class="form-group">
                                <label for="productStock">Stock *</label>
                                <input type="number" id="productStock" name="stock" min="0" value="${product?.stock || ''}" required class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="productImage">Product Image</label>
                            <input type="file" id="productImage" accept="image/*" class="form-control">
                            <input type="text" id="productImageName" name="imageName" value="${product?.img || ''}" class="form-control" placeholder="Image filename (e.g., bag1.jpg)">
                            <div id="imagePreview" class="image-preview">
                                ${product?.img ? `<img src="${product.img}" alt="Current" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 4px;">` : ''}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="productStatus" name="status" ${product?.status !== 'inactive' ? 'checked' : ''}>
                                Active
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <p><strong>Size Options:</strong> Will be auto-generated based on sub-category</p>
                            <p><small>Clothing: M, L, XL, XXL | Footwear: 40-45 | Accessories: No size</small></p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="window.dashboard.closeProductModal()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.dashboard.saveProduct('${product?.id || ''}')">
                        ${isEdit ? 'Update Product' : 'Save Product'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add image preview functionality
        const imageInput = document.getElementById('productImage');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.previewImage(e.target.files[0]));
        }
        
        // Store editing product ID
        this.editingProductId = product?.id || null;
    }

    previewImage(file) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 4px;">
                `;
                this.selectedImageFile = file;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
            this.selectedImageFile = null;
        }
    }

    closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) modal.remove();
        this.selectedImageFile = null;
        this.currentImageUrl = null;
        this.editingProductId = null;
    }

    async saveProduct(productId = '') {
        console.log('Saving product...');
        
        const form = document.getElementById('productForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const imageName = formData.get('imageName') || formData.get('image')?.name || 'default.jpg';
        
        // Create product data matching website structure
        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            subCategory: formData.get('subCategory'),
            color: formData.get('color'),
            price: formData.get('price'), // Keep as string like website
            img: imageName, // Image filename
            stock: parseInt(formData.get('stock')),
            status: formData.get('status') ? 'active' : 'inactive',
            updatedAt: Date.now()
        };
        
        try {
            // Handle image upload if provided
            if (this.selectedImageFile) {
                const imageUrl = await this.uploadImage(this.selectedImageFile);
                productData.img = imageUrl;
                // Also add the full path field like website
                if (imageUrl.includes('images/')) {
                    productData.imagePath = imageUrl;
                }
            }
            
            if (productId) {
                // Update existing product
                const productRef = dbRef(db, `products/${productId}`);
                await update(productRef, productData);
                ToastManager.show('Product updated successfully!', 'success');
            } else {
                // Add new product
                productData.createdAt = Date.now();
                productData.id = Date.now(); // Add ID like website
                
                const productsRef = dbRef(db, 'products');
                const newProductRef = push(productsRef);
                await set(newProductRef, productData);
                ToastManager.show('Product saved successfully!', 'success');
            }
            
            this.closeProductModal();
            
            // Refresh products list
            this.loadProductManagement();
            
        } catch (error) {
            console.error('Error saving product:', error);
            ToastManager.show('Failed to save product', 'error');
        }
    }

    async uploadImage(file) {
        if (!file) return null;
        
        try {
            const storageReference = storageRef(storage, `products/${Date.now()}_${file.name}`);
            await uploadBytes(storageReference, file);
            const downloadURL = await getDownloadURL(storageReference);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async editProduct(productId) {
        console.log('Editing product:', productId);
        
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            ToastManager.show('Product not found', 'error');
            return;
        }
        
        // Create edit modal with product data
        this.createProductModal(product);
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            const productRef = dbRef(db, `products/${productId}`);
            await remove(productRef);
            
            ToastManager.show('Product deleted successfully', 'success');
            this.loadProductManagement();
            
        } catch (error) {
            console.error('Error deleting product:', error);
            ToastManager.show('Failed to delete product', 'error');
        }
    }

    async updateStock(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const newStock = prompt(`Update stock for ${product.name}:`, product.stock || 0);
        if (newStock === null) return;
        
        try {
            const productRef = dbRef(db, `products/${productId}`);
            await update(productRef, {
                stock: parseInt(newStock),
                updatedAt: Date.now()
            });
            
            ToastManager.show('Stock updated successfully', 'success');
            
        } catch (error) {
            console.error('Error updating stock:', error);
            ToastManager.show('Failed to update stock', 'error');
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const orderRef = dbRef(db, `orders/${orderId}`);
            await update(orderRef, {
                status: newStatus,
                updatedAt: Date.now()
            });
            
            ToastManager.show('Order status updated', 'success');
            
        } catch (error) {
            console.error('Error updating order status:', error);
            ToastManager.show('Failed to update order status', 'error');
        }
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        alert(`Order Details:\n\nID: ${order.id}\nCustomer: ${order.customerName}\nEmail: ${order.customerEmail}\nTotal: $${order.total}\nStatus: ${order.status}`);
    }

    async saveSettings() {
        console.log('Saving settings...');
        ToastManager.show('Settings saved successfully', 'success');
    }

    async logout() {
        try {
            await signOut(auth);
            ToastManager.show('Logged out successfully', 'success');
            window.location.href = "index.html";
        } catch (error) {
            console.error('Logout error:', error);
            ToastManager.show('Logout failed', 'error');
        }
    }

    updateAllStock() {
        ToastManager.show('Bulk stock update feature coming soon', 'info');
    }

    openUploadModal() {
        ToastManager.show('Media upload feature coming soon', 'info');
    }
}

// Initialize dashboard
const dashboard = new AdminDashboard();
window.dashboard = dashboard;

// Make functions globally available for onclick handlers
window.closePendingOrdersPanel = function() {
    const overlay = document.getElementById('pendingOrdersOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};
