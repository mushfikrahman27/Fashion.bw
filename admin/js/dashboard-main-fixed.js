// admin/js/dashboard-main-fixed.js - CONSOLIDATED ADMIN DASHBOARD ARCHITECTURE
// This is now the single source of truth for admin dashboard functionality

console.log('🔍 ADMIN DEBUG: Admin dashboard script loaded successfully!');

// Test Firebase write permission
setTimeout(() => {
    try {
        const testRef = dbRef(db, 'test-write');
        set(testRef, { 
            message: 'Admin can write to Firebase', 
            timestamp: Date.now() 
        }).then(() => {
            console.log('✅ ADMIN DEBUG: Firebase write test SUCCESS - admin can save to database');
        }).catch(error => {
            console.error('❌ ADMIN DEBUG: Firebase write test FAILED - admin cannot save:', error);
        });
    } catch (error) {
        console.error('❌ ADMIN DEBUG: Firebase test setup failed:', error);
    }
}, 2000);

import { auth, db, storage } from '../../firebase-config.js';
import { 
    ref as dbRef, 
    onValue, 
    off,
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

// ========================================
// 1. AUTHENTICATION & SECURITY
// ========================================

// Enhanced auth with admin role checking
let isAdmin = false;
let currentUserId = null;

async function checkAdminRole(uid) {
    try {
        const adminRef = dbRef(db, `admins/${uid}`);
        const snapshot = await get(adminRef);
        return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
        console.error('Error checking admin role:', error);
        return false;
    }
}

function requireAdminOrBlock(actionName) {
    if (!isAdmin) {
        showToast('Admin access required for ' + actionName, 'error');
        return false;
    }
    return true;
}

function disableAdminControls() {
    const adminControls = document.querySelectorAll('[data-admin-only], .btn-sm, #mediaUploadBtn');
    adminControls.forEach(control => {
        control.disabled = true;
        control.style.opacity = '0.5';
        control.title = 'Admin access required';
    });
}

function enableAdminControls() {
    const disabledControls = document.querySelectorAll('[disabled][title*="Admin access required"]');
    disabledControls.forEach(control => {
        control.disabled = false;
        control.style.opacity = '1';
        control.title = '';
    });
}

function showUnauthorizedMessage() {
    const container = document.querySelector('.dashboard-container') || document.body;
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 500;
    `;
    message.textContent = 'Limited access: Admin privileges required for some actions';
    container.appendChild(message);
    setTimeout(() => message.remove(), 5000);
}

// Auth state management
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    
    currentUserId = user.uid;
    isAdmin = await checkAdminRole(user.uid);
    
    if (!isAdmin) {
        disableAdminControls();
        showUnauthorizedMessage();
    } else {
        enableAdminControls();
    }
    
    // Initialize dashboard
    initializeDashboard();
});

// ========================================
// 2. GLOBAL STATE & UTILS
// ========================================

let dashboardState = {
    currentSection: 'dashboard',
    products: [],
    orders: [],
    visits: [],
    performanceChart: null,
    selectedProducts: new Set(),
    bulkEditMode: { action: null, data: null }
};

// Toast notification system
function showToast(message, type = 'success', duration = 4000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    // Create new toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#212529' : 'white'};
        padding: 12px 20px;
        border-radius: 6px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 350px;
        pointer-events: auto;
        cursor: pointer;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            ">×</button>
        </div>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    });
}

// Utility functions for better state management
function showLoadingState(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function showEmptyState(containerId, icon, title, message, actionText = null, actionCallback = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const actionHtml = actionText ? `<button class="btn btn-primary" onclick="${actionCallback}">${actionText}</button>` : '';
    
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3>${title}</h3>
            <p>${message}</p>
            ${actionHtml}
        </div>
    `;
}

function showErrorState(containerId, title, message, retryCallback = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const retryHtml = retryCallback ? `<button class="btn btn-secondary" onclick="${retryCallback}">Try Again</button>` : '';
    
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>${title}</h3>
            <p>${message}</p>
            ${retryHtml}
        </div>
    `;
}

function formatCurrency(amount, currency = '৳') {
    return `${currency}${(amount || 0).toLocaleString()}`;
}

function formatDate(dateString, includeTime = false) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString(undefined, options);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced error handling
function handleAsyncError(error, context = 'Operation') {
    console.error(`${context} error:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error.code === 'permission-denied') {
        message = 'You do not have permission to perform this action';
    } else if (error.code === 'not-found') {
        message = 'The requested data was not found';
    } else if (error.code === 'network-error') {
        message = 'Network error. Please check your connection';
    } else if (error.message) {
        message = error.message;
    }
    
    showToast(message, 'error');
}

// Mobile menu functionality
function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('open');
            }
        });
    }
}

// Form validation
class FormValidator {
    static validateProduct(product) {
        const errors = [];
        if (!product.name || product.name.trim().length < 2) {
            errors.push('Product name must be at least 2 characters');
        }
        if (!product.price || product.price <= 0) {
            errors.push('Price must be greater than 0');
        }
        if (!product.category) {
            errors.push('Category is required');
        }
        const stockValue = parseInt(product.stock) || 0;
        if (stockValue < 0 || stockValue > 99999) {
            errors.push('Stock must be between 0 and 99,999');
        }
        return errors;
    }
    
    static sanitizeInput(input) {
        if (!input) return '';
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '');
    }
}

// Order schema normalization (consolidated from all versions)
function normalizeOrder(rawOrder, orderKey) {
    const normalized = {
        key: orderKey,
        orderId: rawOrder.orderId || rawOrder.id || orderKey,
        createdAt: rawOrder.createdAt || rawOrder.timestamp || Date.now(),
        status: rawOrder.status || "pending",
        channel: rawOrder.channel || "unknown",
        customer: {
            name: rawOrder.customer?.name || rawOrder.name || "",
            phone: rawOrder.customer?.phone || rawOrder.phone || "",
            address: rawOrder.customer?.address || rawOrder.address || ""
        },
        items: [],
        totals: {
            subtotal: 0,
            deliveryCharge: 0,
            total: 0
        }
    };

    // Normalize items
    if (rawOrder.items && Array.isArray(rawOrder.items)) {
        normalized.items = rawOrder.items.map(item => ({
            productId: item.productId || item.id || "",
            name: item.name || item.productName || "",
            price: parseFloat(item.price) || 0,
            qty: parseInt(item.qty || item.quantity || 1),
            selectedSize: item.selectedSize || item.size || "N/A",
            color: item.color || ""
        }));
    } else if (rawOrder.productName) {
        normalized.items = [{
            productId: rawOrder.productId || "",
            name: rawOrder.productName || rawOrder.name || "",
            price: parseFloat(rawOrder.price) || 0,
            qty: parseInt(rawOrder.quantity || rawOrder.qty || 1),
            selectedSize: rawOrder.size || rawOrder.selectedSize || "N/A",
            color: rawOrder.color || ""
        }];
    }

    // Calculate totals
    const computedSubtotal = normalized.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    if (rawOrder.totals) {
        normalized.totals = {
            subtotal: rawOrder.totals.subtotal ?? computedSubtotal,
            deliveryCharge: rawOrder.totals.deliveryCharge ?? 0,
            total: rawOrder.totals.total ?? computedSubtotal
        };
    } else {
        normalized.totals = {
            subtotal: rawOrder.subtotal ?? computedSubtotal,
            deliveryCharge: rawOrder.deliveryCharge ?? 0,
            total: rawOrder.total ?? computedSubtotal
        };
    }

    return normalized;
}

// Animation helpers
function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerText = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function hideSkeletons() {
    document.querySelectorAll('.skeleton-list, .skeleton').forEach(el => el.style.display = 'none');
}

// ========================================
// 3. NAVIGATION & ROUTING
// ========================================

class NavigationController {
    constructor() {
        this.routes = new Map();
        this.currentRoute = 'dashboard';
        this.setupNavigationHandlers();
    }
    
    setupNavigationHandlers() {
        // Dashboard nav
        document.getElementById('navDashboard')?.addEventListener('click', () => {
            this.navigateTo('dashboard');
        });
        
        // Orders nav
        document.getElementById('navOrders')?.addEventListener('click', () => {
            this.navigateTo('orders');
        });
        
        // Products nav
        document.getElementById('navProducts')?.addEventListener('click', () => {
            this.navigateTo('products');
        });
        
        // Inventory nav
        document.getElementById('navInventory')?.addEventListener('click', () => {
            this.navigateTo('inventory');
        });
        
        // Media nav
        document.getElementById('navMedia')?.addEventListener('click', () => {
            this.navigateTo('media');
        });
        
        // Settings nav
        document.getElementById('navSettings')?.addEventListener('click', () => {
            this.navigateTo('settings');
        });
        
        // Messages nav
        // Navigates to the messages section (currently a structured placeholder shell)
        document.getElementById('navMessages')?.addEventListener('click', () => {
            this.navigateTo('messages');
            showToast('Messaging center is not connected to a backend yet. This section is prepared for future real messages.', 'info');
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
    }
    
    navigateTo(route) {
        if (this.currentRoute === route) return;
        
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById(`nav${route.charAt(0).toUpperCase() + route.slice(1)}`)?.classList.add('active');
        
        // Update current route
        this.currentRoute = route;
        dashboardState.currentSection = route;
        
        // Load section content
        this.loadSection(route);
    }
    
    loadSection(section) {
        // Hide all sections first
        document.querySelectorAll('.dashboard-body, .section-content').forEach(el => {
            el.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // Initialize section-specific content if needed
            this.initializeSection(section);
        } else {
            console.warn(`Section ${section} not found`);
            // Fallback to dashboard
            this.showDashboardView();
        }
        
        // Update page title
        this.updatePageTitle(section);
    }
    
    initializeSection(section) {
        switch(section) {
            case 'dashboard':
                // Dashboard is already initialized
                break;
            case 'orders':
                // Load orders when accessing orders section
                if (window.dashboardApp && window.dashboardApp.orderManager) {
                    window.dashboardApp.orderManager.loadOrders();
                }
                break;
            case 'products':
                // Load products when accessing products section
                if (window.dashboardApp && window.dashboardApp.productManager) {
                    window.dashboardApp.productManager.loadProducts();
                }
                break;
            case 'inventory':
                // Load inventory when accessing inventory section
                if (window.dashboardApp && window.dashboardApp.inventoryManager) {
                    window.dashboardApp.inventoryManager.loadInventory();
                }
                break;
            case 'media':
                // Load media library when accessing media section
                if (window.dashboardApp && window.dashboardApp.mediaManager) {
                    window.dashboardApp.mediaManager.loadMediaLibrary();
                }
                break;
            case 'settings':
                // Load settings when accessing settings section
                if (window.dashboardApp && window.dashboardApp.settingsManager) {
                    window.dashboardApp.settingsManager.loadSettings();
                }
                break;
            case 'messages':
                // This section has placeholder content for now
                break;
        }
    }
    
    showDashboardView() {
        // Show dashboard content
        const dashboardContent = document.querySelector('.dashboard-body');
        if (dashboardContent) {
            dashboardContent.style.display = 'block';
        }
    }
    
    updatePageTitle(section) {
        const titles = {
            dashboard: 'Dashboard Overview',
            orders: 'Order Management',
            products: 'Product Management',
            inventory: 'Inventory Management',
            media: 'Media Manager',
            settings: 'Settings',
            messages: 'Messages'
        };
        
        const titleElement = document.querySelector('.topbar-title h1');
        if (titleElement) {
            titleElement.textContent = titles[section] || 'Admin Dashboard';
        }
    }
    
    async handleLogout() {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Logout failed', 'error');
        }
    }
}

// ========================================
// 3. DATA CONTROLLER
// ========================================

class DataController {
    constructor() {
        this.dashboardData = {
            orders: [],
            products: [],
            stats: {
                totalOrders: 0,
                totalRevenue: 0,
                lowStockCount: 0,
                topProduct: { name: '-', sales: 0 }
            }
        };
        this.chartInstance = null;
    }
    
    async loadDashboardStats() {
        try {
            // Load orders data
            const ordersRef = dbRef(db, 'orders');
            const ordersSnapshot = await get(ordersRef);
            const orders = ordersSnapshot.val() || {};
            
            // Load products data
            const productsRef = dbRef(db, 'products');
            const productsSnapshot = await get(productsRef);
            const products = productsSnapshot.val() || {};
            
            // Calculate real statistics
            this.calculateRealStats(orders, products);
            
            // Update dashboard UI
            this.updateDashboardUI();
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showToast('Error loading dashboard data', 'error');
        }
    }
    
    calculateRealStats(orders, products) {
        // Convert to arrays
        const ordersArray = Object.entries(orders).map(([id, data]) => ({ id, ...data }));
        const productsArray = Object.entries(products).map(([id, data]) => ({ id, ...data }));
        
        // Calculate total orders and revenue
        const totalOrders = ordersArray.length;
        const totalRevenue = ordersArray.reduce((sum, order) => sum + (order.total || 0), 0);
        
        // Calculate low stock items
        const lowStockThreshold = 5; // Default threshold
        const lowStockItems = productsArray.filter(product => 
            (product.stock || 0) <= lowStockThreshold
        );
        
        // Find top selling product
        const productSales = {};
        ordersArray.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const productName = item.name || 'Unknown Product';
                    productSales[productName] = (productSales[productName] || 0) + (item.quantity || 1);
                });
            }
        });
        
        const topProduct = Object.entries(productSales)
            .sort(([,a], [,b]) => b - a)[0] || ['-', 0];
        
        // Update stats
        this.dashboardData.stats = {
            totalOrders,
            totalRevenue,
            lowStockCount: lowStockItems.length,
            topProduct: {
                name: topProduct[0],
                sales: topProduct[1]
            }
        };
        
        // Store data for other components
        this.dashboardData.orders = ordersArray;
        this.dashboardData.products = productsArray;
        this.dashboardData.lowStockItems = lowStockItems;
    }
    
    updateDashboardUI() {
        const stats = this.dashboardData.stats;
        
        // Update KPI cards
        document.getElementById('totalOrders').textContent = stats.totalOrders.toLocaleString();
        document.getElementById('totalRevenue').textContent = `৳${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('lowStockCount').textContent = stats.lowStockCount;
        document.getElementById('topProductName').textContent = stats.topProduct.name;
        document.getElementById('topProductSales').textContent = `${stats.topProduct.sales} sales`;
        
        // Update supporting panels
        this.updateTopProductsPanel();
        this.updateRecentOrdersPanel();
        this.updateLowStockPanel();
    }
    
    updateTopProductsPanel() {
        const topProductsList = document.getElementById('topProductsList');
        const topProductsCount = document.getElementById('topProductsCount');
        
        // Calculate top products
        const productSales = {};
        this.dashboardData.orders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const productName = item.name || 'Unknown Product';
                    productSales[productName] = (productSales[productName] || 0) + (item.quantity || 1);
                });
            }
        });
        
        const topProducts = Object.entries(productSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        // Update UI
        topProductsCount.textContent = topProducts.length;
        
        if (topProducts.length === 0) {
            topProductsList.innerHTML = `
                <div class="empty-panel">
                    <p>No sales data available</p>
                </div>
            `;
            return;
        }
        
        topProductsList.innerHTML = topProducts.map(([name, sales], index) => `
            <div class="top-product-item">
                <div class="product-rank">#${index + 1}</div>
                <div class="product-info">
                    <div class="product-name">${name}</div>
                    <div class="product-sales">${sales} sold</div>
                </div>
                <div class="product-badge">${sales > 10 ? '🔥' : '📈'}</div>
            </div>
        `).join('');
    }
    
    updateRecentOrdersPanel() {
        const recentOrdersList = document.getElementById('recentOrdersList');
        const recentOrdersCount = document.getElementById('recentOrdersCount');
        
        // Get recent orders (last 5)
        const recentOrders = this.dashboardData.orders
            .sort((a, b) => (b.date || 0) - (a.date || 0))
            .slice(0, 5);
        
        // Update UI
        recentOrdersCount.textContent = recentOrders.length;
        
        if (recentOrders.length === 0) {
            recentOrdersList.innerHTML = `
                <div class="empty-panel">
                    <p>No orders yet</p>
                </div>
            `;
            return;
        }
        
        recentOrdersList.innerHTML = recentOrders.map(order => `
            <div class="recent-order-item">
                <div class="order-info">
                    <div class="order-id">#${order.id}</div>
                    <div class="order-customer">${order.customerName || 'Unknown'}</div>
                </div>
                <div class="order-details">
                    <div class="order-total">৳${(order.total || 0).toLocaleString()}</div>
                    <div class="order-status ${order.status || 'pending'}">${order.status || 'pending'}</div>
                </div>
            </div>
        `).join('');
    }
    
    updateLowStockPanel() {
        const lowStockList = document.getElementById('lowStockList');
        const lowStockAlertCount = document.getElementById('lowStockAlertCount');
        
        // Update UI
        lowStockAlertCount.textContent = this.dashboardData.lowStockItems.length;
        
        if (this.dashboardData.lowStockItems.length === 0) {
            lowStockList.innerHTML = `
                <div class="empty-panel">
                    <p>✅ All products are well stocked</p>
                </div>
            `;
            return;
        }
        
        lowStockList.innerHTML = this.dashboardData.lowStockItems.slice(0, 5).map(product => `
            <div class="low-stock-item">
                <div class="stock-info">
                    <div class="product-name">${product.name}</div>
                    <div class="stock-quantity">${product.stock || 0} left</div>
                </div>
                <div class="stock-action">
                    <button class="btn-sm primary" onclick="window.dashboardApp.inventoryManager.openStockUpdate('${product.id}')">
                        Restock
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    getDashboardData() {
        return this.dashboardData;
    }
    
    getOrders() {
        return this.dashboardData.orders;
    }
    
    getProducts() {
        return this.dashboardData.products;
    }
    
    getLowStockItems() {
        return this.dashboardData.lowStockItems;
    }
}

// ========================================
// 5. PRODUCT MANAGER
// ========================================

class ProductManager {
    constructor() {
        this.products = [];
        this.selectedProducts = new Set();
        this.bulkActionType = '';
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        const searchBtn = document.getElementById('productSearchBtn');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.handleSearch(searchInput.value));
        }
        
        // Filter functionality
        const categoryFilter = document.getElementById('productFilterCategory');
        const statusFilter = document.getElementById('productFilterStatus');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Bulk actions
        const selectAllCheckbox = document.getElementById('selectAllProducts');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
        }
        
        const bulkActionType = document.getElementById('bulkActionType');
        if (bulkActionType) {
            bulkActionType.addEventListener('change', (e) => this.handleBulkActionType(e.target.value));
        }
            
        const bulkApplyBtn = document.getElementById('bulkApplyBtn');
        if (bulkApplyBtn) {
            bulkApplyBtn.addEventListener('click', () => this.applyBulkAction());
        }
            
        const bulkClearBtn = document.getElementById('bulkClearBtn');
        if (bulkClearBtn) {
            bulkClearBtn.addEventListener('click', () => this.clearBulkSelection());
        }
            
        // Add product button
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.showAddProductForm());
        }
            
        // Export button
        const exportProductsBtn = document.getElementById('exportProductsBtn');
        if (exportProductsBtn) {
            exportProductsBtn.addEventListener('click', () => this.exportProducts());
        }
    }
        
    async loadProducts() {
        try {
            this.showLoading(true);
                
            const productsRef = dbRef(db, 'products');
            const snapshot = await get(productsRef);
            const productsData = snapshot.val() || {};
                
            this.products = Object.entries(productsData).map(([id, product]) => ({
                id,
                ...product
            }));
                
            // Set up real-time listener for automatic updates
            if (this.productsListener) {
                off(this.productsListener);
            }
            
            this.productsListener = onValue(productsRef, (snapshot) => {
                const updatedData = snapshot.val() || {};
                this.products = Object.entries(updatedData).map(([id, product]) => ({
                    id,
                    ...product
                }));
                this.renderProducts();
                console.log('🔄 Admin products updated in real-time');
            });
                
            this.renderProducts();
            this.updateStockSummary(this.products);
            this.showLoading(false);
                
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Error loading products', 'error');
            this.showLoading(false);
        }
    }
        
    handleSearch(searchTerm) {
        console.log('🔍 Unified search triggered with term:', searchTerm);
        console.log('📦 Available products:', this.products?.length || 0);
        
        // If no products loaded, try to load them first
        if (!this.products || this.products.length === 0) {
            console.log('⚠️ No products loaded, attempting to load...');
            this.loadProducts().then(() => {
                console.log('📦 Products loaded:', this.products?.length || 0);
                this.performUnifiedSearch(searchTerm);
            });
            return;
        }
        
        this.performUnifiedSearch(searchTerm);
    }
    
    performUnifiedSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            console.log('🔄 Empty search, showing all products');
            this.renderFilteredProducts(this.products);
            this.updateStockSummary(this.products);
            this.hideSearchResults();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        console.log('🔍 Searching for:', searchLower);
        
        const filtered = this.products.filter(product => {
            // Primary search: product name
            const nameMatch = product.name && product.name.toLowerCase().includes(searchLower);
            
            // Secondary search: category
            const categoryMatch = product.category && product.category.toLowerCase().includes(searchLower);
            
            // Tertiary search: subCategory
            const subCategoryMatch = product.subCategory && product.subCategory.toLowerCase().includes(searchLower);
            
            // Optional search: color
            const colorMatch = product.color && product.color.toLowerCase().includes(searchLower);
            
            const matches = nameMatch || categoryMatch || subCategoryMatch || colorMatch;
            
            if (matches) {
                console.log(`✅ Match found: ${product.name} (${product.category}/${product.subCategory})`);
            }
            
            return matches;
        });
        
        console.log(`🎯 Search results: ${filtered.length} products found`);
        this.renderFilteredProducts(filtered);
        this.updateStockSummary(filtered);
        
        // Show search results dropdown
        this.showSearchResults(filtered, searchTerm);
    }
    
    showSearchResults(results, searchTerm) {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (!dropdown) return;
        
        if (!searchTerm || searchTerm.trim() === '') {
            this.hideSearchResults();
            return;
        }
        
        if (results.length === 0) {
            dropdown.innerHTML = '<div class="no-search-results">No matching products found</div>';
            dropdown.style.display = 'block';
            return;
        }
        
        // Limit results to prevent UI overflow
        const maxResults = 8;
        const limitedResults = results.slice(0, maxResults);
        
        dropdown.innerHTML = limitedResults.map(product => `
            <div class="search-result-item" onclick="window.dashboardApp.productManager.selectSearchResult('${product.id}')">
                <img src="${product.img || product.imgUrl || product.image || 'https://via.placeholder.com/40'}" alt="${product.name}" class="search-result-image">
                <div class="search-result-info">
                    <div class="search-result-name">${product.name}</div>
                    <div class="search-result-meta">
                        <span class="search-result-category">${product.category}</span>
                        <span class="search-result-price">৳${product.price}</span>
                    </div>
                </div>
                <button class="search-result-edit-btn" onclick="event.stopPropagation(); window.dashboardApp.productManager.editProduct('${product.id}')">Edit</button>
            </div>
        `).join('');
        
        dropdown.style.display = 'block';
    }
    
    hideSearchResults() {
        const dropdown = document.getElementById('searchResultsDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
    
    selectSearchResult(productId) {
        // Hide search results
        this.hideSearchResults();
        
        // Clear search input
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Edit the selected product
        this.editProduct(productId);
    }
        
    applyFilters() {
        const filtered = this.getFilteredProducts();
        this.renderFilteredProducts(filtered);
        this.updateStockSummary(filtered);
    }
        
    getFilteredProducts() {
        const categoryFilter = document.getElementById('productFilterCategory')?.value || '';
        const statusFilter = document.getElementById('productFilterStatus')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';
            
        return this.products.filter(product => {
            // Category filter
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            
            // Status filter (inactive uses stored status; others use derived stock status)
            const matchesStatus = !statusFilter || (
                statusFilter === 'inactive'
                    ? (product.status === 'inactive')
                    : this.getProductStatus(product) === statusFilter
            );
            
            // Stock filter
            let matchesStock = true;
            if (stockFilter === 'in-stock') {
                matchesStock = (product.stock || 0) > 0;
            } else if (stockFilter === 'low-stock') {
                matchesStock = (product.stock || 0) <= 5 && (product.stock || 0) > 0;
            } else if (stockFilter === 'out-of-stock') {
                matchesStock = (product.stock || 0) === 0;
            }
            
            return matchesCategory && matchesStatus && matchesStock;
        });
    }
    
    updateStockSummary(products) {
        const lowStockCount = products.filter(p => (p.stock || 0) <= 5 && (p.stock || 0) > 0).length;
        const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;
        
        const stockSummary = document.getElementById('stockSummary');
        const lowStockElement = document.getElementById('lowStockCount');
        const outOfStockElement = document.getElementById('outOfStockCount');
        
        if (stockSummary && lowStockElement && outOfStockElement) {
            lowStockElement.textContent = lowStockCount;
            outOfStockElement.textContent = outOfStockCount;
            
            // Show summary only if there are issues
            if (lowStockCount > 0 || outOfStockCount > 0) {
                stockSummary.style.display = 'block';
            } else {
                stockSummary.style.display = 'none';
            }
        }
    }
        
    getProductStatus(product) {
        const stock = product.stock || 0;
        if (stock === 0) return 'out-of-stock';
        if (stock <= 5) return 'low-stock';
        return 'active';
    }
    
    getStockClass(product) {
        const stock = product.stock || 0;
        if (stock === 0) return 'out-of-stock';
        if (stock <= 5) return 'low-stock';
        return 'in-stock';
    }
        
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const productId = checkbox.dataset.productId;
            if (checked) {
                this.selectedProducts.add(productId);
            } else {
                this.selectedProducts.delete(productId);
            }
        });
        this.updateBulkActionBar();
    }
        
    handleProductSelection(productId, checked) {
        if (checked) {
            this.selectedProducts.add(productId);
        } else {
            this.selectedProducts.delete(productId);
        }
        this.updateBulkActionBar();
    }
        
    handleBulkActionType(actionType) {
        this.bulkActionType = actionType;
        this.updateBulkActionBar();
    }
        
    updateBulkActionBar() {
        const bulkActionBar = document.getElementById('bulkActionBar');
        const bulkSelectedCount = document.getElementById('bulkSelectedCount');
        const bulkApplyBtn = document.getElementById('bulkApplyBtn');
            
        if (this.selectedProducts.size > 0) {
            if (bulkActionBar) bulkActionBar.style.display = 'flex';
            if (bulkSelectedCount) bulkSelectedCount.textContent = this.selectedProducts.size;
                
            // Enable apply button only if action type is selected
            const actionType = document.getElementById('bulkActionType')?.value;
            if (bulkApplyBtn) {
                bulkApplyBtn.disabled = !actionType;
            }
        } else {
            if (bulkActionBar) bulkActionBar.style.display = 'none';
        }
    }
        
    async applyBulkAction() {
        if (!this.bulkActionType || this.selectedProducts.size === 0) {
            showToast('Please select products and an action', 'error');
            return;
        }
            
        try {
            switch (this.bulkActionType) {
                case 'category':
                    await this.bulkChangeCategory();
                    break;
                case 'status':
                    await this.bulkChangeStatus();
                    break;
                case 'price':
                    await this.bulkAdjustPrice();
                    break;
                case 'stock':
                    await this.bulkAdjustStock();
                    break;
                case 'delete':
                    await this.bulkDeleteProducts();
                    break;
                default:
                    showToast('Invalid action', 'error');
                    return;
            }
                
            this.clearBulkSelection();
            showToast('Bulk action completed successfully', 'success');
                
        } catch (error) {
            console.error('Error applying bulk action:', error);
            showToast('Error applying bulk action', 'error');
        }
    }
        
    async bulkChangeCategory() {
        const newCategory = prompt('Enter new category:');
        if (!newCategory) return;
            
        const updates = {};
        this.selectedProducts.forEach(productId => {
            updates[`products/${productId}/category`] = newCategory;
        });
            
        await update(dbRef(db), updates);
        await this.loadProducts();
    }
        
    async bulkChangeStatus() {
        const newStatus = prompt('Enter new status (active/inactive/out-of-stock):');
        if (!newStatus) return;
            
        const updates = {};
        this.selectedProducts.forEach(productId => {
            const product = this.products.find(p => p.id === productId);
            if (newStatus === 'out-of-stock') {
                updates[`products/${productId}/stock`] = 0;
            } else if (newStatus === 'active' && product.stock === 0) {
                updates[`products/${productId}/stock`] = 10;
            }
        });
        
        await update(dbRef(db), updates);
        await this.loadProducts();
    }
    
    async bulkAdjustPrice() {
        const adjustment = prompt('Enter price adjustment (+10%, -5%, or fixed amount):');
        if (!adjustment) return;
        
        const updates = {};
        this.selectedProducts.forEach(productId => {
            const product = this.products.find(p => p.id === productId);
            let newPrice = product.price || 0;
            
            if (adjustment.includes('%')) {
                const percentage = parseFloat(adjustment) / 100;
                newPrice = newPrice * (1 + percentage);
            } else {
                newPrice = parseFloat(adjustment);
            }
            
            updates[`products/${productId}/price`] = Math.max(0, newPrice);
        });
        
        await update(dbRef(db), updates);
        await this.loadProducts();
    }
    
    async bulkAdjustStock() {
        const adjustment = prompt('Enter stock adjustment (+10, -5, or fixed amount):');
        if (!adjustment) return;
        
        const updates = {};
        this.selectedProducts.forEach(productId => {
            const product = this.products.find(p => p.id === productId);
            let newStock = product.stock || 0;
            
            if (adjustment.startsWith('+') || adjustment.startsWith('-')) {
                newStock += parseInt(adjustment);
            } else {
                newStock = parseInt(adjustment);
            }
            
            updates[`products/${productId}/stock`] = Math.max(0, newStock);
        });
        
        await update(dbRef(db), updates);
        await this.loadProducts();
    }
    
    async bulkDeleteProducts() {
        if (!confirm(`Are you sure you want to delete ${this.selectedProducts.size} products?`)) {
            return;
        }
        
        const updates = {};
        this.selectedProducts.forEach(productId => {
            updates[`products/${productId}`] = null;
        });
        
        await update(dbRef(db), updates);
        await this.loadProducts();
    }
    
    clearBulkSelection() {
        this.selectedProducts.clear();
        this.bulkActionType = '';
        
        // Clear checkboxes
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        
        // Clear select all
        const selectAllCheckbox = document.getElementById('selectAllProducts');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        
        // Reset action dropdown
        const actionDropdown = document.getElementById('bulkActionType');
        if (actionDropdown) actionDropdown.value = '';
        
        this.updateBulkActionBar();
    }
    
    renderProducts() {
        this.renderFilteredProducts(this.products);
    }
    
    renderFilteredProducts(products) {
        console.log('🎨 Rendering products:', products.length, 'items');
        const tableBody = document.getElementById('productsTableBody');
        const emptyState = document.getElementById('productsEmpty');
        const loading = document.getElementById('productsLoading');
        
        console.log('🔍 Elements found:', {
            tableBody: !!tableBody,
            emptyState: !!emptyState,
            loading: !!loading
        });
        
        if (!tableBody) {
            console.error('❌ productsTableBody not found!');
            return;
        }

        if (loading) loading.style.display = 'none';
        const tableWrapper = document.querySelector('.products-list-container .products-table-wrapper');
        if (products.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (tableWrapper) tableWrapper.style.display = 'none';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = '';

        tableBody.innerHTML = products.map(product => `
            <tr>
                <td class="checkbox-column">
                    <input type="checkbox" class="checkbox product-checkbox" 
                           data-product-id="${product.id}"
                           onchange="window.dashboardApp.productManager.handleProductSelection('${product.id}', this.checked)">
                </td>
                <td class="image-column">
                    <img src="${product.img || product.imgUrl || product.image || 'https://via.placeholder.com/50'}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                </td>
                <td class="name-column">${product.name}</td>
                <td class="category-column">${product.category}</td>
                <td class="subcategory-column">${product.subCategory || '-'}</td>
                <td class="price-column">৳${(product.price || 0).toLocaleString()}</td>
                <td class="stock-column">
                    <span class="${this.getStockClass(product)}">${product.stock || 0}</span>
                </td>
                <td class="status-column">
                    <span class="status-badge ${this.getProductStatus(product)}">
                        ${this.getProductStatus(product)}
                    </span>
                </td>
                <td class="date-column">${product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '-'}</td>
                <td class="actions-column">
                    <button class="btn-sm secondary" onclick="window.dashboardApp.productManager.editProduct('${product.id}')">Edit</button>
                    <button class="btn-sm danger" onclick="window.dashboardApp.productManager.deleteProduct('${product.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    convertToCSV(products) {
        const esc = (v) => {
            const s = String(v ?? '');
            if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        };
        const headers = ['id', 'name', 'category', 'subCategory', 'price', 'stock', 'status'];
        const lines = [headers.join(',')];
        products.forEach((p) => {
            lines.push([
                esc(p.id),
                esc(p.name),
                esc(p.category),
                esc(p.subCategory),
                esc(p.price),
                esc(p.stock),
                esc(p.status)
            ].join(','));
        });
        return lines.join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async exportProducts() {
        try {
            const products = this.getFilteredProducts();
            const csv = this.convertToCSV(products);
            this.downloadCSV(csv, 'products.csv');
            showToast('Products exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting products:', error);
            showToast('Error exporting products', 'error');
        }
    }
    
    showAddProductForm() {
        this.currentEditingProduct = null;
        this.resetForm();
        document.getElementById('productFormTitle').textContent = 'Add New Product';
        document.getElementById('productFormModal').classList.add('active');
        this.setupCategorySubcategoryLogic();
        this.setupImageUpload();
        document.body.style.overflow = 'hidden';
    }
    
    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        this.currentEditingProduct = product;
        this.populateForm(product);
        document.getElementById('productFormTitle').textContent = 'Edit Product';
        document.getElementById('productFormModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    populateForm(product) {
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = product.price != null && product.price !== '' ? String(product.price) : '';
        document.getElementById('productStock').value = product.stock || '';
        document.getElementById('productStatus').value = product.status || 'active';
        document.getElementById('productSize').value = product.size || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productColor').value = product.color || '';
        
        // Setup category/subcategory for editing
        this.setupCategorySubcategoryLogic();
        
        // Trigger category change to populate subcategory
        const categorySelect = document.getElementById('productCategory');
        categorySelect.dispatchEvent(new Event('change'));
        
        // Set subcategory after options are populated
        setTimeout(() => {
            document.getElementById('productSubCategory').value = product.subCategory || '';
        }, 100);
        
        // Set image if exists - check both img and image fields
        const imageUrl = product.img || product.image;
        if (imageUrl) {
            const preview = document.getElementById('productImagePreviewImg');
            const placeholder = document.getElementById('imagePlaceholder');
            const removeBtn = document.getElementById('removeImageBtn');
            
            preview.src = imageUrl;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            removeBtn.style.display = 'inline-block';
        }
    }
    
    resetForm() {
        const form = document.getElementById('productForm');
        if (form) form.reset();
        
        // Clear image preview
        const preview = document.getElementById('productImagePreviewImg');
        const placeholder = document.getElementById('imagePlaceholder');
        const removeBtn = document.getElementById('removeImageBtn');
        
        preview.src = '';
        preview.style.display = 'none';
        placeholder.style.display = 'block';
        removeBtn.style.display = 'none';
        
        // Clear uploaded file
        this.uploadedImageFile = null;
        
        // Clear errors
        document.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
        
        // Reset submission state
        this.isSubmitting = false;
        this.currentEditingProduct = null;
    }
    
    closeProductForm() {
        document.getElementById('productFormModal').classList.remove('active');
        document.body.style.overflow = '';
        this.resetForm();
    }
    
    async handleProductSubmit() {
        console.log('🔍 ADMIN DEBUG: handleProductSubmit called!');
        
        // Prevent duplicate submissions
        if (this.isSubmitting) {
            return;
        }
        
        this.isSubmitting = true;
        console.log('🔍 ADMIN DEBUG: isSubmitting set to true');
        
        if (!this.validateForm()) {
            console.log('🔍 ADMIN DEBUG: Validation failed - returning');
            this.isSubmitting = false;
            return;
        }
        
        console.log('🔍 ADMIN DEBUG: Validation passed - proceeding with save');
        
        try {
            const formData = this.getFormData();
            console.log('🔍 ADMIN DEBUG: Form data retrieved:', formData);
            
            // Show loading and disable button
            const saveBtn = document.getElementById('saveProductBtn');
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            if (this.currentEditingProduct) {
                // Update existing product
                console.log('🔍 ADMIN DEBUG: Updating existing product:', this.currentEditingProduct.id);
                await this.updateProduct(this.currentEditingProduct.id, formData);
                showToast('Product updated successfully', 'success');
            } else {
                // Add new product
                console.log('🔍 ADMIN DEBUG: Adding new product');
                await this.addProduct(formData);
                showToast('Product added successfully', 'success');
            }
            
            this.closeProductForm();
            await this.loadProducts();
            
        } catch (error) {
            console.error('🔍 ADMIN DEBUG: Error in handleProductSubmit:', error);
            console.error('🔍 ADMIN DEBUG: Full error details:', error);
            showToast('Error saving product: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            console.log('🔍 ADMIN DEBUG: Finally block - resetting form state');
            this.isSubmitting = false;
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtn.textContent === 'Saving...' ? 'Save Product' : saveBtn.textContent;
        }
    }
    
    // Category/SubCategory mapping
    categorySubcategoryMap = {
        'Women': ['Bags', 'Most Viewed', 'Dress', 'Trending', 'Shoes'],
        'Men': ['Sneakers', 'Shoes', 'Shirt', 'Sunglasses', 'Bags', 'Hoodie'],
        'Collection': ['Watches', 'Belts', 'Caps']
    };

    setupCategorySubcategoryLogic() {
        const categorySelect = document.getElementById('productCategory');
        const subCategorySelect = document.getElementById('productSubCategory');
        if (!categorySelect || !subCategorySelect) return;
        if (this._categorySubBound) {
            categorySelect.dispatchEvent(new Event('change'));
            return;
        }
        this._categorySubBound = true;
        categorySelect.addEventListener('change', () => {
            const selectedCategory = categorySelect.value;
            subCategorySelect.innerHTML = '<option value="">Select SubCategory</option>';
            
            if (selectedCategory && this.categorySubcategoryMap[selectedCategory]) {
                this.categorySubcategoryMap[selectedCategory].forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub;
                    option.textContent = sub;
                    subCategorySelect.appendChild(option);
                });
            }
        });
    }

    setupImageUpload() {
        const imageInput = document.getElementById('productImage');
        const previewImg = document.getElementById('productImagePreviewImg');
        const placeholder = document.getElementById('imagePlaceholder');
        const removeBtn = document.getElementById('removeImageBtn');
        if (!imageInput) return;
        if (this._imageUploadBound) return;
        this._imageUploadBound = true;
        
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.validateAndPreviewImage(file);
            }
        });
        
        // Click to upload
        const uploadArea = document.querySelector('.image-upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    imageInput.click();
                }
            });
        }
    }

    validateAndPreviewImage(file) {
        const previewImg = document.getElementById('productImagePreviewImg');
        const placeholder = document.getElementById('imagePlaceholder');
        const removeBtn = document.getElementById('removeImageBtn');
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showFieldError('productImage', 'Please upload a valid image file (JPG, PNG, WebP)');
            return false;
        }
        
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showFieldError('productImage', 'Image size must be less than 5MB');
            return false;
        }
        
        // Clear previous error
        this.clearFieldError('productImage');
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            placeholder.style.display = 'none';
            removeBtn.style.display = 'inline-block';
            this.uploadedImageFile = file;
        };
        reader.readAsDataURL(file);
        
        return true;
    }

    removeImage() {
        const previewImg = document.getElementById('productImagePreviewImg');
        const placeholder = document.getElementById('imagePlaceholder');
        const removeBtn = document.getElementById('removeImageBtn');
        const imageInput = document.getElementById('productImage');
        
        previewImg.src = '';
        previewImg.style.display = 'none';
        placeholder.style.display = 'block';
        removeBtn.style.display = 'none';
        imageInput.value = '';
        this.uploadedImageFile = null;
    }

    async uploadProductImage(file) {
        if (!file) return null;
        
        try {
            const fileRef = storageRef(storage, `products/${Date.now()}_${file.name}`);
            const uploadResult = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    validateForm() {
        console.log('🔍 ADMIN DEBUG: Starting form validation...');
        let isValid = true;
        
        // Clear previous errors
        document.querySelectorAll('.form-error').forEach(error => error.textContent = '');
        
        // Get form values with proper validation
        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value.trim();
        const subCategory = document.getElementById('productSubCategory').value.trim();
        const price = document.getElementById('productPrice').value.trim();
        const stock = document.getElementById('productStock').value.trim();
        
        console.log('🔍 ADMIN DEBUG: Form values:', { name, category, subCategory, price, stock });
        
        // Validate required fields with edge cases
        if (!name || name.length < 2) {
            console.log('🔍 ADMIN DEBUG: Name validation failed:', name);
            this.showFieldError('productName', 'Product name must be at least 2 characters');
            isValid = false;
        }
        
        if (!category) {
            console.log('🔍 ADMIN DEBUG: Category validation failed:', category);
            this.showFieldError('productCategory', 'Category is required');
            isValid = false;
        }
        
        if (!subCategory) {
            console.log('🔍 ADMIN DEBUG: SubCategory validation failed:', subCategory);
            this.showFieldError('productSubCategory', 'SubCategory is required');
            isValid = false;
        }
        
        // Price validation
        const priceNum = parseFloat(price);
        if (!price || isNaN(priceNum) || priceNum <= 0) {
            console.log('🔍 ADMIN DEBUG: Price validation failed:', price, priceNum);
            this.showFieldError('productPrice', 'Price must be greater than 0');
            isValid = false;
        } else if (priceNum > 999999) {
            console.log('🔍 ADMIN DEBUG: Price too high:', priceNum);
            this.showFieldError('productPrice', 'Price seems too high');
            isValid = false;
        }
        
        // Stock validation
        const stockNum = parseInt(stock);
        if (stock === '' || isNaN(stockNum) || stockNum < 0) {
            console.log('🔍 ADMIN DEBUG: Stock validation failed:', stock, stockNum);
            this.showFieldError('productStock', 'Stock must be 0 or greater');
            isValid = false;
        } else if (stockNum > 99999) {
            this.showFieldError('productStock', 'Stock quantity seems too high');
            isValid = false;
        }
        
        // Image validation for new products
        if (!this.uploadedImageFile && !this.currentEditingProduct) {
            console.log('🔍 ADMIN DEBUG: Image validation failed - no image uploaded');
            this.showFieldError('productImage', 'Product image is required');
            isValid = false;
        }
        
        console.log('🔍 ADMIN DEBUG: Validation result:', isValid);
        return isValid;
    }
    
    getFormData() {
        return {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value.trim(),
            subCategory: document.getElementById('productSubCategory').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value).toFixed(2), // Always 2 decimal places
            stock: parseInt(document.getElementById('productStock').value) || 0,
            color: document.getElementById('productColor').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            status: document.getElementById('productStatus').value || 'active',
            size: document.getElementById('productSize').value.trim()
        };
    }
    
    async addProduct(productData) {
        try {
            console.log('🔍 ADMIN DEBUG: Starting addProduct with data:', productData);
            
            // Upload image first if provided
            let imageUrl = '';
            if (this.uploadedImageFile) {
                showToast('Uploading image...', 'info');
                imageUrl = await this.uploadProductImage(this.uploadedImageFile);
                console.log('🔍 ADMIN DEBUG: Image uploaded to:', imageUrl);
            }
            
            const priceNum = parseFloat(productData.price);
            // Create product object with frontend-compatible structure
            const productObject = {
                id: '', // Will be set by Firebase key
                name: productData.name,
                price: priceNum,
                img: imageUrl || 'images/placeholder.jpg', // Frontend expects img field
                category: productData.category,
                subCategory: productData.subCategory,
                color: productData.color || 'Default',
                description: productData.description || '',
                stock: productData.stock,
                status: productData.status || 'active',
                size: productData.size || '',
                createdAt: Date.now(),
                isActive: true // Frontend filters for active products
            };
            
            console.log('🔍 ADMIN DEBUG: Product object to save:', productObject);
            
            // Save to Firebase
            console.log('🔍 ADMIN DEBUG: Saving to Firebase path: products');
            const productsRef = dbRef(db, 'products');
            console.log('🔍 ADMIN DEBUG: Firebase products ref created');
            
            const newProductRef = push(productsRef);
            console.log('🔍 ADMIN DEBUG: New product ref created with key:', newProductRef.key);
            
            const finalProductData = {
                ...productObject,
                id: newProductRef.key
            };
            console.log('🔍 ADMIN DEBUG: Final data to set:', finalProductData);
            
            await set(newProductRef, finalProductData);
            console.log('🔍 ADMIN DEBUG: Product saved successfully to Firebase with key:', newProductRef.key);
            
            return newProductRef.key;
        } catch (error) {
            console.error('🔍 ADMIN DEBUG: Error adding product:', error);
            console.error('🔍 ADMIN DEBUG: Full error details:', error);
            throw error;
        }
    }
    
    async updateProduct(productId, productData) {
        try {
            // For editing, we need to handle image updates carefully
            let updateData = { ...productData };
            
            // Handle image update
            if (this.uploadedImageFile) {
                // New image uploaded - upload it
                showToast('Uploading new image...', 'info');
                const imageUrl = await this.uploadProductImage(this.uploadedImageFile);
                updateData.img = imageUrl;
                updateData.updatedAt = Date.now();
            } else if (!this.currentEditingProduct?.img && !this.uploadedImageFile) {
                // No existing image and no new image - use placeholder
                updateData.img = 'images/placeholder.jpg';
            }
            // If no new image and existing image exists, keep existing img (don't overwrite)
            
            // Ensure frontend compatibility (numeric price for DB rules; site maps to display string)
            updateData.price = parseFloat(updateData.price);
            updateData.isActive = updateData.status === 'active';
            
            const productRef = dbRef(db, `products/${productId}`);
            await update(productRef, updateData);
            
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }
    
    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        document.getElementById('deleteProductName').textContent = product.name;
        document.getElementById('deleteConfirmModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Store product ID for deletion
        this.productToDelete = productId;
    }
    
    async confirmDelete() {
        if (!this.productToDelete) return;
        
        try {
            const productRef = dbRef(db, `products/${this.productToDelete}`);
            await remove(productRef);
            
            showToast('Product deleted successfully', 'success');
            this.closeDeleteConfirm();
            await this.loadProducts();
            
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Error deleting product', 'error');
        }
    }
    
    closeDeleteConfirm() {
        document.getElementById('deleteConfirmModal').classList.remove('active');
        document.body.style.overflow = '';
        this.productToDelete = null;
    }
    
    showLoading(show) {
        const loading = document.getElementById('productsLoading');
        const tableWrapper = document.querySelector('.products-table-wrapper');
        const emptyState = document.getElementById('productsEmpty');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
        }
    }
}

// ========================================
// 6. ORDER MANAGER
// ========================================

class OrderManager {
    constructor() {
        this.orders = [];
        this.currentViewingOrder = null;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Search and filters
        const searchInput = document.getElementById('orderSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }
        
        const statusFilter = document.getElementById('orderStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshOrdersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadOrders());
        }
        
        // Export button
        const exportOrdersBtn = document.getElementById('exportOrdersBtn');
        if (exportOrdersBtn) {
            exportOrdersBtn.addEventListener('click', () => this.exportOrders());
        }
        
        // Status update
        const updateStatusBtn = document.getElementById('updateStatusBtn');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', () => this.updateOrderStatus());
        }
    }
    
    async loadOrders() {
        try {
            this.showLoading(true);
            
            const ordersRef = dbRef(db, 'orders');
            const snapshot = await get(ordersRef);
            const ordersData = snapshot.val() || {};
            
            this.orders = Object.entries(ordersData).map(([id, order]) => ({
                ...order,
                id
            }));
            
            // Sort by date (newest first)
            this.orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            this.renderOrders();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading orders:', error);
            showToast('Error loading orders', 'error');
            this.showLoading(false);
        }
    }
    
    renderOrders() {
        const tbody = document.getElementById('ordersTableBody');
        const emptyState = document.getElementById('ordersEmpty');
        const tableWrapper = document.querySelector('.orders-table-wrapper');
        
        if (!tbody) return;
        
        const filteredOrders = this.getFilteredOrders();
        
        if (filteredOrders.length === 0) {
            tbody.innerHTML = '';
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (tableWrapper) tableWrapper.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = filteredOrders.map(order => `
            <tr data-order-id="${order.id}">
                <td>
                    <div class="order-id">${this.formatOrderId(order.id)}</div>
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customer?.name || 'Unknown Customer'}</div>
                        <div class="customer-email">${order.customer?.email || ''}</div>
                    </div>
                </td>
                <td>
                    <div class="order-date">${this.formatDate(order.createdAt)}</div>
                </td>
                <td>
                    <div class="items-count">${order.items?.length || 0}</div>
                </td>
                <td>
                    <div class="order-total">৳${this.calculateTotal(order).toFixed(2)}</div>
                </td>
                <td>
                    <span class="order-status-badge ${order.status || 'pending'}">
                        ${this.formatStatus(order.status)}
                    </span>
                </td>
                <td>
                    <div class="order-actions">
                        <button class="btn-sm primary" onclick="window.dashboardApp.orderManager.viewOrderDetail('${order.id}')">View</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    getFilteredOrders() {
        let filtered = [...this.orders];
        
        // Search filter
        const searchTerm = document.getElementById('orderSearchInput')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(order => 
                this.formatOrderId(order.id).toLowerCase().includes(searchTerm) ||
                order.customer?.name?.toLowerCase().includes(searchTerm) ||
                order.customer?.email?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Status filter
        const statusFilter = document.getElementById('orderStatusFilter')?.value;
        if (statusFilter) {
            filtered = filtered.filter(order => order.status === statusFilter);
        }
        
        // Date filter
        const dateFilter = document.getElementById('dateFilter')?.value;
        if (dateFilter) {
            const now = Date.now();
            filtered = filtered.filter(order => {
                const orderDate = order.createdAt || 0;
                switch(dateFilter) {
                    case 'today':
                        return orderDate > now - (24 * 60 * 60 * 1000);
                    case 'week':
                        return orderDate > now - (7 * 24 * 60 * 60 * 1000);
                    case 'month':
                        return orderDate > now - (30 * 24 * 60 * 60 * 1000);
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }
    
    formatOrderId(id) {
        if (!id) return 'N/A';
        return id.slice(-8).toUpperCase();
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    formatStatus(status) {
        if (!status) return 'Pending';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
    
    calculateTotal(order) {
        if (!order.items || !Array.isArray(order.items)) return 0;
        return order.items.reduce((total, item) => {
            return total + (item.price || 0) * (item.quantity || 1);
        }, 0);
    }
    
    viewOrderDetail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        this.currentViewingOrder = order;
        this.populateOrderDetail(order);
        document.getElementById('orderDetailModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    populateOrderDetail(order) {
        // Order Information
        document.getElementById('detailOrderId').textContent = this.formatOrderId(order.id);
        document.getElementById('detailOrderDate').textContent = new Date(order.createdAt || Date.now()).toLocaleString();
        document.getElementById('detailOrderStatus').innerHTML = `<span class="order-status-badge ${order.status || 'pending'}">${this.formatStatus(order.status)}</span>`;
        document.getElementById('detailOrderTotal').textContent = `৳${this.calculateTotal(order).toFixed(2)}`;
        
        // Customer Information
        const customer = order.customer || {};
        document.getElementById('detailCustomerName').textContent = customer.name || 'N/A';
        document.getElementById('detailCustomerEmail').textContent = customer.email || 'N/A';
        document.getElementById('detailCustomerPhone').textContent = customer.phone || 'N/A';
        document.getElementById('detailCustomerAddress').textContent = customer.address || 'N/A';
        
        // Order Items
        const itemsContainer = document.getElementById('detailOrderItems');
        if (order.items && Array.isArray(order.items)) {
            itemsContainer.innerHTML = order.items.map(item => `
                <div class="order-item">
                    <div class="order-item-info">
                        <div class="order-item-name">${item.name || 'Unknown Product'}</div>
                        <div class="order-item-details">
                            Quantity: ${item.quantity || 1} 
                            ${item.size ? `| Size: ${item.size}` : ''}
                            ${item.color ? `| Color: ${item.color}` : ''}
                        </div>
                    </div>
                    <div class="order-item-price">৳${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                </div>
            `).join('');
        } else {
            itemsContainer.innerHTML = '<p>No items found</p>';
        }
        
        // Set current status in dropdown
        document.getElementById('newOrderStatus').value = order.status || 'pending';
    }
    
    closeOrderDetail() {
        document.getElementById('orderDetailModal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentViewingOrder = null;
    }
    
    async updateOrderStatus() {
        if (!this.currentViewingOrder) return;
        
        try {
            const newStatus = document.getElementById('newOrderStatus').value;
            const updateBtn = document.getElementById('updateStatusBtn');
            
            // Show loading
            const originalText = updateBtn.textContent;
            updateBtn.disabled = true;
            updateBtn.textContent = 'Updating...';
            
            // Update in Firebase
            const orderRef = dbRef(db, `orders/${this.currentViewingOrder.id}`);
            await update(orderRef, {
                status: newStatus,
                updatedAt: Date.now()
            });
            
            // Update local data
            this.currentViewingOrder.status = newStatus;
            const index = this.orders.findIndex(o => o.id === this.currentViewingOrder.id);
            if (index !== -1) {
                this.orders[index].status = newStatus;
            }
            
            // Update UI
            this.populateOrderDetail(this.currentViewingOrder);
            this.renderOrders();
            
            showToast('Order status updated successfully', 'success');
            
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Error updating order status', 'error');
        } finally {
            const updateBtn = document.getElementById('updateStatusBtn');
            updateBtn.disabled = false;
            updateBtn.textContent = 'Update Status';
        }
    }
    
    handleSearch(e) {
        this.renderOrders();
    }
    
    applyFilters() {
        this.renderOrders();
    }
    
    clearFilters() {
        document.getElementById('orderSearchInput').value = '';
        document.getElementById('orderStatusFilter').value = '';
        document.getElementById('dateFilter').value = '';
        this.renderOrders();
    }
    
    showLoading(show) {
        const loading = document.getElementById('ordersLoading');
        const tableWrapper = document.querySelector('.orders-table-wrapper');
        const emptyState = document.getElementById('ordersEmpty');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
        }
    }
}

// ========================================
// 7. INVENTORY MANAGER
// ========================================

class InventoryManager {
    constructor() {
        this.products = [];
        this.selectedItems = new Set();
        this.currentUpdatingProduct = null;
        this.lowStockThreshold = 5;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Search and filters
        const searchInput = document.getElementById('inventorySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }
        
        const stockStatusFilter = document.getElementById('stockStatusFilter');
        if (stockStatusFilter) {
            stockStatusFilter.addEventListener('change', () => this.applyFilters());
        }
        
        const categoryFilter = document.getElementById('inventoryCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshInventoryBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadInventory());
        }
        
        // Stock update save button
        const saveStockBtn = document.getElementById('saveStockBtn');
        if (saveStockBtn) {
            saveStockBtn.addEventListener('click', () => this.saveStockUpdate());
        }
        
        // Stock input validation
        const stockInput = document.getElementById('newStockValue');
        if (stockInput) {
            stockInput.addEventListener('input', (e) => this.validateStockInput(e));
        }
    }
    
    async loadInventory() {
        try {
            this.showLoading(true);
            
            const productsRef = dbRef(db, 'products');
            const snapshot = await get(productsRef);
            const productsData = snapshot.val() || {};
            
            this.products = Object.entries(productsData).map(([id, product]) => ({
                ...product,
                id
            }));
            
            // Sort by name for consistency
            this.products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            this.renderInventory();
            this.renderLowStockAlerts();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading inventory:', error);
            showToast('Error loading inventory', 'error');
            this.showLoading(false);
        }
    }
    
    renderInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        const emptyState = document.getElementById('inventoryEmpty');
        const tableWrapper = document.querySelector('.inventory-table-wrapper');
        
        if (!tbody) return;
        
        const filteredProducts = this.getFilteredProducts();
        
        if (filteredProducts.length === 0) {
            tbody.innerHTML = '';
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (tableWrapper) tableWrapper.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = filteredProducts.map(product => `
            <tr data-product-id="${product.id}">
                <td>
                    <div class="inventory-product">
                        ${product.image ? 
                            `<img src="${product.image}" alt="${product.name}" class="inventory-product-image">` :
                            `<div class="inventory-product-image-placeholder">📷</div>`
                        }
                        <div class="inventory-product-info">
                            <div class="inventory-product-name">${product.name || 'Unnamed Product'}</div>
                            ${product.size ? `<div class="inventory-product-size">Size: ${product.size}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge ${product.category || 'default'}">${product.category || 'Uncategorized'}</span>
                </td>
                <td>
                    <div class="stock-quantity">${product.stock || 0}</div>
                </td>
                <td>
                    <span class="stock-status-badge ${this.getStockStatusClass(product.stock)}">
                        ${this.getStockStatusText(product.stock)}
                    </span>
                </td>
                <td>
                    <div class="inventory-actions">
                        <button class="btn-sm primary" onclick="window.dashboardApp.inventoryManager.openStockUpdate('${product.id}')">Update Stock</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderLowStockAlerts() {
        const container = document.getElementById('lowStockAlertsList');
        if (!container) return;
        
        const lowStockProducts = this.products.filter(product => 
            (product.stock || 0) <= this.lowStockThreshold && (product.stock || 0) > 0
        );
        
        const outOfStockProducts = this.products.filter(product => 
            (product.stock || 0) === 0
        );
        
        if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No low stock alerts. All products are well stocked!</p>';
            return;
        }
        
        const alerts = [
            ...lowStockProducts.map(product => ({
                ...product,
                type: 'warning',
                priority: 'low'
            })),
            ...outOfStockProducts.map(product => ({
                ...product,
                type: 'critical',
                priority: 'high'
            }))
        ];
        
        // Sort by priority (critical first) then by stock level
        alerts.sort((a, b) => {
            if (a.type === 'critical' && b.type !== 'critical') return -1;
            if (a.type !== 'critical' && b.type === 'critical') return 1;
            return (a.stock || 0) - (b.stock || 0);
        });
        
        container.innerHTML = alerts.map(product => `
            <div class="low-stock-alert-item ${product.type === 'critical' ? 'critical' : ''}">
                <div class="alert-item-info">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}" class="alert-item-image">` :
                        `<div class="alert-item-image" style="background: var(--background); display: flex; align-items: center; justify-content: center; font-size: 1rem;">📷</div>`
                    }
                    <div class="alert-item-details">
                        <div class="alert-item-name">${product.name || 'Unnamed Product'}</div>
                        <div class="alert-item-stock">
                            ${product.stock === 0 ? 'Out of stock' : `Only ${product.stock} left`}
                            ${product.size ? ` | Size: ${product.size}` : ''}
                        </div>
                    </div>
                </div>
                <div class="alert-item-actions">
                    <button class="btn-sm primary" onclick="window.dashboardApp.inventoryManager.openStockUpdate('${product.id}')">Update Stock</button>
                </div>
            </div>
        `).join('');
    }
    
    getFilteredProducts() {
        let filtered = [...this.products];
        
        // Search filter
        const searchTerm = document.getElementById('inventorySearchInput')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(product => 
                product.name?.toLowerCase().includes(searchTerm) ||
                product.category?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Stock status filter
        const stockStatusFilter = document.getElementById('stockStatusFilter')?.value;
        if (stockStatusFilter) {
            filtered = filtered.filter(product => this.getStockStatusClass(product.stock) === stockStatusFilter);
        }
        
        // Category filter
        const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value;
        if (categoryFilter) {
            filtered = filtered.filter(product => product.category === categoryFilter);
        }
        
        return filtered;
    }
    
    getStockStatusClass(stock) {
        if (stock <= 0) return 'out-of-stock';
        if (stock <= this.lowStockThreshold) return 'low-stock';
        return 'in-stock';
    }
    
    getStockStatusText(stock) {
        if (stock <= 0) return 'Out of Stock';
        if (stock <= this.lowStockThreshold) return 'Low Stock';
        return 'In Stock';
    }
    
    openStockUpdate(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        this.currentUpdatingProduct = product;
        this.populateStockUpdateModal(product);
        document.getElementById('stockUpdateModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    populateStockUpdateModal(product) {
        // Product information
        document.getElementById('stockProductName').textContent = product.name || 'Unnamed Product';
        document.getElementById('stockProductCategory').textContent = `Category: ${product.category || 'Uncategorized'}`;
        document.getElementById('stockProductSize').textContent = product.size ? `Size: ${product.size}` : '';
        
        // Product image
        const productImage = document.getElementById('stockProductImage');
        if (product.image) {
            productImage.src = product.image;
            productImage.style.display = 'block';
        } else {
            productImage.style.display = 'none';
        }
        
        // Current stock
        document.getElementById('currentStockValue').textContent = product.stock || 0;
        
        // Set initial value for new stock
        const stockInput = document.getElementById('newStockValue');
        stockInput.value = product.stock || 0;
        stockInput.focus();
        stockInput.select();
        
        // Clear any previous errors
        document.getElementById('stockUpdateError').textContent = '';
    }
    
    closeStockUpdate() {
        document.getElementById('stockUpdateModal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentUpdatingProduct = null;
    }
    
    validateStockInput(e) {
        const input = e.target;
        const value = parseInt(input.value);
        const errorElement = document.getElementById('stockUpdateError');
        
        // Clear previous error
        errorElement.textContent = '';
        
        // Validate
        if (isNaN(value) || value < 0) {
            errorElement.textContent = 'Stock quantity must be a positive number';
            input.classList.add('error');
        } else if (value > 9999) {
            errorElement.textContent = 'Stock quantity cannot exceed 9999';
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    }
    
    async saveStockUpdate() {
        if (!this.currentUpdatingProduct) return;
        
        try {
            const newStockValue = parseInt(document.getElementById('newStockValue').value);
            const errorElement = document.getElementById('stockUpdateError');
            
            // Validation
            if (isNaN(newStockValue) || newStockValue < 0) {
                errorElement.textContent = 'Please enter a valid stock quantity';
                return;
            }
            
            if (newStockValue > 9999) {
                errorElement.textContent = 'Stock quantity cannot exceed 9999';
                return;
            }
            
            // Show loading
            const saveBtn = document.getElementById('saveStockBtn');
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Updating...';
            
            // Update in Firebase
            const productRef = dbRef(db, `products/${this.currentUpdatingProduct.id}`);
            await update(productRef, {
                stock: newStockValue,
                updatedAt: Date.now()
            });
            
            // Update local data
            this.currentUpdatingProduct.stock = newStockValue;
            const index = this.products.findIndex(p => p.id === this.currentUpdatingProduct.id);
            if (index !== -1) {
                this.products[index].stock = newStockValue;
            }
            
            // Update UI
            this.renderInventory();
            this.renderLowStockAlerts();
            
            showToast('Stock updated successfully', 'success');
            this.closeStockUpdate();
            
        } catch (error) {
            console.error('Error updating stock:', error);
            showToast('Error updating stock', 'error');
        } finally {
            const saveBtn = document.getElementById('saveStockBtn');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Update Stock';
        }
    }
    
    handleSearch(e) {
        this.renderInventory();
    }
    
    applyFilters() {
        this.renderInventory();
    }
    
    clearFilters() {
        document.getElementById('inventorySearchInput').value = '';
        document.getElementById('stockStatusFilter').value = '';
        document.getElementById('inventoryCategoryFilter').value = '';
        this.renderInventory();
    }
    
    showLoading(show) {
        const loading = document.getElementById('inventoryLoading');
        const tableWrapper = document.querySelector('.inventory-table-wrapper');
        const emptyState = document.getElementById('inventoryEmpty');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
        }
    }
}

// ========================================
// 8. MEDIA MANAGER
// ========================================

class MediaManager {
    constructor() {
        this.mediaItems = [];
        this.currentPreviewItem = null;
        this.currentUpload = null;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('mediaFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        // Drag and drop
        const uploadArea = document.getElementById('mediaUploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
            uploadArea.addEventListener('click', () => fileInput.click());
        }
        
        // Search and sort
        const searchInput = document.getElementById('mediaSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }
        
        const sortSelect = document.getElementById('mediaSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.applySorting());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshLibraryBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMediaLibrary());
        }
        
        // Preview modal actions
        const deleteBtn = document.getElementById('deleteMediaBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentMedia());
        }
        
        const useBtn = document.getElementById('useMediaBtn');
        if (useBtn) {
            useBtn.addEventListener('click', () => this.useMediaInProduct());
        }
    }
    
    async loadMediaLibrary() {
        try {
            this.showLoading(true);
            
            const mediaRef = dbRef(db, 'media');
            const snapshot = await get(mediaRef);
            const mediaData = snapshot.val() || {};
            
            this.mediaItems = Object.entries(mediaData).map(([id, media]) => ({
                ...media,
                id
            }));
            
            this.applySorting();
            this.renderMediaGrid();
            this.updateMediaCount();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading media library:', error);
            showToast('Error loading media library', 'error');
            this.showLoading(false);
        }
    }
    
    renderMediaGrid() {
        const grid = document.getElementById('mediaLibraryGrid');
        const emptyState = document.getElementById('mediaLibraryEmpty');
        const loading = document.getElementById('mediaLibraryLoading');
        
        if (!grid) return;
        
        if (loading) loading.style.display = 'none';
        
        if (this.mediaItems.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        grid.innerHTML = this.mediaItems.map(media => `
            <div class="media-item" onclick="window.dashboardApp.mediaManager.openPreview('${media.id}')">
                <img src="${media.url}" alt="${media.name}" class="media-item-image">
                <div class="media-item-info">
                    <div class="media-item-name" title="${media.name}">${media.name}</div>
                    <div class="media-item-details">
                        <span class="media-item-size">${this.formatFileSize(media.size)}</span>
                        <span class="media-item-date">${this.formatDate(media.uploadedAt)}</span>
                    </div>
                    <div class="media-item-actions">
                        <button class="btn-sm secondary" onclick="event.stopPropagation(); window.dashboardApp.mediaManager.copyUrl('${media.url}')">Copy URL</button>
                        <button class="btn-sm primary" onclick="event.stopPropagation(); window.dashboardApp.mediaManager.useMediaInProduct('${media.id}')">Use</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.uploadFiles(files);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleFileDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            showToast('Please select image files only', 'error');
            return;
        }
        
        this.uploadFiles(imageFiles);
    }
    
    async uploadFiles(files) {
        if (files.length === 0) return;
        
        // Validate files
        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                showToast(`${file.name} is not an image file`, 'error');
                return false;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast(`${file.name} exceeds 5MB limit`, 'error');
                return false;
            }
            return true;
        });
        
        if (validFiles.length === 0) return;
        
        // Show progress
        this.showUploadProgress(true);
        
        try {
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                this.currentUpload = file;
                
                this.updateProgress(0, `Uploading ${file.name}...`);
                
                // Create unique filename
                const timestamp = Date.now();
                const filename = `${timestamp}_${file.name}`;
                const mediaRef = storageRef(storage, `media/${filename}`);
                
                // Upload to Firebase Storage
                const uploadTask = uploadBytesResumable(mediaRef, file);
                
                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            this.updateProgress(progress, `Uploading ${file.name}...`);
                        },
                        (error) => {
                            reject(error);
                        },
                        async () => {
                            try {
                                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                                
                                // Save to database
                                const mediaData = {
                                    name: file.name,
                                    url: downloadUrl,
                                    size: file.size,
                                    type: file.type,
                                    uploadedAt: Date.now(),
                                    storagePath: `media/${filename}`
                                };
                                
                                const mediaRef = dbRef(db, `media/${timestamp}`);
                                await set(mediaRef, mediaData);
                                
                                // Add to local array
                                this.mediaItems.unshift({
                                    ...mediaData,
                                    id: timestamp.toString()
                                });
                                
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        }
                    );
                });
            }
            
            this.renderMediaGrid();
            this.updateMediaCount();
            showToast(`Successfully uploaded ${validFiles.length} file(s)`, 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Error uploading files', 'error');
        } finally {
            this.showUploadProgress(false);
            this.currentUpload = null;
            // Clear file input
            document.getElementById('mediaFileInput').value = '';
        }
    }
    
    cancelUpload() {
        showToast('Upload cancellation not yet supported', 'info');
    }
    
    showUploadProgress(show) {
        const progressDiv = document.getElementById('uploadProgress');
        const uploadArea = document.getElementById('mediaUploadArea');
        
        if (show) {
            if (progressDiv) progressDiv.style.display = 'block';
            if (uploadArea) uploadArea.style.display = 'none';
        } else {
            if (progressDiv) progressDiv.style.display = 'none';
            if (uploadArea) uploadArea.style.display = 'block';
            this.updateProgress(0, 'Preparing upload...');
        }
    }
    
    updateProgress(percent, status) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const uploadStatus = document.getElementById('uploadStatus');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${Math.round(percent)}%`;
        if (uploadStatus) uploadStatus.textContent = status;
    }
    
    openPreview(mediaId) {
        const media = this.mediaItems.find(m => m.id === mediaId);
        if (!media) return;
        
        this.currentPreviewItem = media;
        this.populatePreviewModal(media);
        document.getElementById('mediaPreviewModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    populatePreviewModal(media) {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = media.url;
        
        document.getElementById('previewFileName').textContent = media.name;
        document.getElementById('previewFileNameDetail').textContent = media.name;
        document.getElementById('previewFileSize').textContent = this.formatFileSize(media.size);
        document.getElementById('previewUploaded').textContent = this.formatDate(media.uploadedAt);
        document.getElementById('previewUrl').value = media.url;
        
        previewImage.onload = () => {
            document.getElementById('previewDimensions').textContent = 
                `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`;
        };
    }
    
    closePreview() {
        document.getElementById('mediaPreviewModal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentPreviewItem = null;
    }
    
    async deleteCurrentMedia() {
        if (!this.currentPreviewItem) return;
        
        if (!confirm(`Are you sure you want to delete "${this.currentPreviewItem.name}"?`)) {
            return;
        }
        
        try {
            if (this.currentPreviewItem.storagePath) {
                const storageRefItem = storageRef(storage, this.currentPreviewItem.storagePath);
                await deleteObject(storageRefItem);
            }
            
            const mediaRef = dbRef(db, `media/${this.currentPreviewItem.id}`);
            await remove(mediaRef);
            
            this.mediaItems = this.mediaItems.filter(m => m.id !== this.currentPreviewItem.id);
            
            this.renderMediaGrid();
            this.updateMediaCount();
            this.closePreview();
            
            showToast('Media deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting media:', error);
            showToast('Error deleting media', 'error');
        }
    }
    
    useMediaInProduct(mediaId = null) {
        const media = mediaId ? 
            this.mediaItems.find(m => m.id === mediaId) : 
            this.currentPreviewItem;
        
        if (!media) return;
        
        const navProducts = document.getElementById('navProducts');
        if (navProducts) {
            navProducts.click();
        }
        
        sessionStorage.setItem('selectedMediaUrl', media.url);
        
        this.closePreview();
        
        showToast('Image ready for use in product form', 'success');
    }
    
    copyUrl(url = null) {
        const mediaUrl = url || (this.currentPreviewItem?.url);
        if (!mediaUrl) return;
        
        navigator.clipboard.writeText(mediaUrl).then(() => {
            showToast('URL copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy URL', 'error');
        });
    }
    
    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm === '') {
            this.applySorting();
            return;
        }
        
        const filtered = this.mediaItems.filter(media => 
            media.name.toLowerCase().includes(searchTerm)
        );
        
        this.renderFilteredMedia(filtered);
    }
    
    applySorting() {
        const sortValue = document.getElementById('mediaSort')?.value || 'newest';
        
        let sorted = [...this.mediaItems];
        
        switch(sortValue) {
            case 'newest':
                sorted.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
                break;
            case 'oldest':
                sorted.sort((a, b) => (a.uploadedAt || 0) - (b.uploadedAt || 0));
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'size':
                sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
                break;
        }
        
        this.mediaItems = sorted;
        this.renderMediaGrid();
    }
    
    renderFilteredMedia(filtered) {
        const grid = document.getElementById('mediaLibraryGrid');
        if (!grid) return;
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No media found matching your search.</p>';
            return;
        }
        
        grid.innerHTML = filtered.map(media => `
            <div class="media-item" onclick="window.dashboardApp.mediaManager.openPreview('${media.id}')">
                <img src="${media.url}" alt="${media.name}" class="media-item-image">
                <div class="media-item-info">
                    <div class="media-item-name" title="${media.name}">${media.name}</div>
                    <div class="media-item-details">
                        <span class="media-item-size">${this.formatFileSize(media.size)}</span>
                        <span class="media-item-date">${this.formatDate(media.uploadedAt)}</span>
                    </div>
                    <div class="media-item-actions">
                        <button class="btn-sm secondary" onclick="event.stopPropagation(); window.dashboardApp.mediaManager.copyUrl('${media.url}')">Copy URL</button>
                        <button class="btn-sm primary" onclick="event.stopPropagation(); window.dashboardApp.mediaManager.useMediaInProduct('${media.id}')">Use</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    updateMediaCount() {
        const countElement = document.getElementById('mediaCount');
        if (countElement) {
            countElement.textContent = `${this.mediaItems.length} item${this.mediaItems.length !== 1 ? 's' : ''}`;
        }
    }
    
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    showLoading(show) {
        const loading = document.getElementById('mediaLibraryLoading');
        const grid = document.getElementById('mediaLibraryGrid');
        const empty = document.getElementById('mediaLibraryEmpty');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (grid) grid.style.display = 'none';
            if (empty) empty.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
            if (grid) grid.style.display = 'grid';
        }
    }
    
    renderMediaGrid() {
        const grid = document.getElementById('mediaLibraryGrid');
        if (!grid) return;
        
        grid.innerHTML = this.mediaItems.map(media => `
            <div class="media-item" onclick="window.dashboardApp.mediaManager.openPreview('${media.id}')">
                <img src="${media.url}" alt="${media.name}" class="media-item-image">
                <div class="media-item-info">
                    <div class="media-item-name" title="${media.name}">${media.name}</div>
                    <div class="media-item-details">
                        <span class="media-item-size">${this.formatFileSize(media.size)}</span>
                        <span class="media-item-date">${this.formatDate(media.uploadedAt)}</span>
                    </div>
                    <div class="media-item-actions">
                        <button class="btn-sm secondary" onclick="event.stopPropagation(); window.dashboardApp.mediaManager.copyUrl('${media.url}')">Copy URL</button>
                        <button class="btn-sm primary" onclick="event.stopPropagation(); window.dashboardApp.mediaManager.useMediaInProduct('${media.id}')">Use</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// ========================================
// 9. SETTINGS MANAGER
// ========================================

class SettingsManager {
    constructor() {
        this.settings = {
            store: {},
            admin: {},
            operational: {}
        };
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Store settings form
        const storeForm = document.getElementById('storeSettingsForm');
        if (storeForm) {
            storeForm.addEventListener('submit', (e) => this.handleStoreSettingsSubmit(e));
        }
        
        // Admin preferences form
        const adminForm = document.getElementById('adminPreferencesForm');
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => this.handleAdminPreferencesSubmit(e));
        }
        
        // Operational settings form
        const operationalForm = document.getElementById('operationalSettingsForm');
        if (operationalForm) {
            operationalForm.addEventListener('submit', (e) => this.handleOperationalSettingsSubmit(e));
        }
        
        // Real-time validation
        this.setupValidationListeners();
    }
    
    setupValidationListeners() {
        // Store settings validation
        const storeName = document.getElementById('storeName');
        const storeEmail = document.getElementById('storeEmail');
        const storePhone = document.getElementById('storePhone');
        
        if (storeName) {
            storeName.addEventListener('input', (e) => this.validateStoreName(e.target));
        }
        if (storeEmail) {
            storeEmail.addEventListener('input', (e) => this.validateStoreEmail(e.target));
        }
        if (storePhone) {
            storePhone.addEventListener('input', (e) => this.validateStorePhone(e.target));
        }
        
        // Admin preferences validation
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        
        if (adminName) {
            adminName.addEventListener('input', (e) => this.validateAdminName(e.target));
        }
        if (adminEmail) {
            adminEmail.addEventListener('input', (e) => this.validateAdminEmail(e.target));
        }
        
        // Operational settings validation
        const lowStockThreshold = document.getElementById('lowStockThreshold');
        
        if (lowStockThreshold) {
            lowStockThreshold.addEventListener('input', (e) => this.validateLowStockThreshold(e.target));
        }
    }
    
    async loadSettings() {
        try {
            // Load all settings from Firebase
            const settingsRef = dbRef(db, 'settings');
            const snapshot = await get(settingsRef);
            const settingsData = snapshot.val() || {};
            
            this.settings = {
                store: settingsData.store || {},
                admin: settingsData.admin || {},
                operational: settingsData.operational || {}
            };
            
            // Populate forms with loaded settings
            this.populateStoreSettings();
            this.populateAdminPreferences();
            this.populateOperationalSettings();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Error loading settings', 'error');
        }
    }
    
    populateStoreSettings() {
        const settings = this.settings.store;
        
        document.getElementById('storeName').value = settings.name || '';
        document.getElementById('storeEmail').value = settings.email || '';
        document.getElementById('storePhone').value = settings.phone || '';
        document.getElementById('storeAddress').value = settings.address || '';
        document.getElementById('storeDescription').value = settings.description || '';
    }
    
    populateAdminPreferences() {
        const settings = this.settings.admin;
        
        document.getElementById('adminName').value = settings.name || '';
        document.getElementById('adminEmail').value = settings.email || '';
        document.getElementById('emailNotifications').checked = settings.emailNotifications || false;
        document.getElementById('darkMode').checked = settings.darkMode || false;
    }
    
    populateOperationalSettings() {
        const settings = this.settings.operational;
        
        document.getElementById('currency').value = settings.currency || 'BDT';
        document.getElementById('lowStockThreshold').value = settings.lowStockThreshold || 5;
        document.getElementById('autoOrderConfirmation').checked = settings.autoOrderConfirmation || false;
        document.getElementById('enableGuestCheckout').checked = settings.enableGuestCheckout || false;
    }
    
    async handleStoreSettingsSubmit(e) {
        e.preventDefault();
        
        if (!this.validateStoreSettings()) {
            return;
        }
        
        try {
            this.setButtonLoading('saveStoreSettingsBtn', true);
            
            const formData = new FormData(e.target);
            const settings = {
                name: formData.get('storeName'),
                email: formData.get('storeEmail'),
                phone: formData.get('storePhone'),
                address: formData.get('storeAddress'),
                description: formData.get('storeDescription'),
                updatedAt: Date.now()
            };
            
            // Save to Firebase
            const storeSettingsRef = dbRef(db, 'settings/store');
            await set(storeSettingsRef, settings);
            
            // Update local settings
            this.settings.store = settings;
            
            showToast('Store settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving store settings:', error);
            showToast('Error saving store settings', 'error');
        } finally {
            this.setButtonLoading('saveStoreSettingsBtn', false);
        }
    }
    
    async handleAdminPreferencesSubmit(e) {
        e.preventDefault();
        
        if (!this.validateAdminPreferences()) {
            return;
        }
        
        try {
            this.setButtonLoading('saveAdminPreferencesBtn', true);
            
            const formData = new FormData(e.target);
            const settings = {
                name: formData.get('adminName'),
                email: formData.get('adminEmail'),
                emailNotifications: formData.get('emailNotifications') === 'on',
                darkMode: formData.get('darkMode') === 'on',
                updatedAt: Date.now()
            };
            
            // Save to Firebase
            const adminSettingsRef = dbRef(db, 'settings/admin');
            await set(adminSettingsRef, settings);
            
            // Update local settings
            this.settings.admin = settings;
            
            // Apply dark mode if enabled
            if (settings.darkMode) {
                this.applyDarkMode();
            }
            
            showToast('Admin preferences saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving admin preferences:', error);
            showToast('Error saving admin preferences', 'error');
        } finally {
            this.setButtonLoading('saveAdminPreferencesBtn', false);
        }
    }
    
    async handleOperationalSettingsSubmit(e) {
        e.preventDefault();
        
        if (!this.validateOperationalSettings()) {
            return;
        }
        
        try {
            this.setButtonLoading('saveOperationalSettingsBtn', true);
            
            const formData = new FormData(e.target);
            const settings = {
                currency: formData.get('currency'),
                lowStockThreshold: parseInt(formData.get('lowStockThreshold')),
                autoOrderConfirmation: formData.get('autoOrderConfirmation') === 'on',
                enableGuestCheckout: formData.get('enableGuestCheckout') === 'on',
                updatedAt: Date.now()
            };
            
            // Save to Firebase
            const operationalSettingsRef = dbRef(db, 'settings/operational');
            await set(operationalSettingsRef, settings);
            
            // Update local settings
            this.settings.operational = settings;
            
            // Update inventory manager low stock threshold
            if (window.dashboardApp && window.dashboardApp.inventoryManager) {
                window.dashboardApp.inventoryManager.lowStockThreshold = settings.lowStockThreshold;
                window.dashboardApp.inventoryManager.renderInventory();
            }
            
            showToast('Operational settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving operational settings:', error);
            showToast('Error saving operational settings', 'error');
        } finally {
            this.setButtonLoading('saveOperationalSettingsBtn', false);
        }
    }
    
    // Validation methods
    validateStoreSettings() {
        const storeName = document.getElementById('storeName');
        const storeEmail = document.getElementById('storeEmail');
        const storePhone = document.getElementById('storePhone');
        
        let isValid = true;
        
        isValid = this.validateStoreName(storeName) && isValid;
        isValid = this.validateStoreEmail(storeEmail) && isValid;
        isValid = this.validateStorePhone(storePhone) && isValid;
        
        return isValid;
    }
    
    validateAdminPreferences() {
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        
        let isValid = true;
        
        isValid = this.validateAdminName(adminName) && isValid;
        isValid = this.validateAdminEmail(adminEmail) && isValid;
        
        return isValid;
    }
    
    validateOperationalSettings() {
        const lowStockThreshold = document.getElementById('lowStockThreshold');
        
        let isValid = true;
        
        isValid = this.validateLowStockThreshold(lowStockThreshold) && isValid;
        
        return isValid;
    }
    
    validateStoreName(input) {
        const value = input.value.trim();
        const errorElement = document.getElementById('storeNameError');
        
        if (value === '') {
            this.showError(input, errorElement, 'Store name is required');
            return false;
        }
        
        if (value.length < 2) {
            this.showError(input, errorElement, 'Store name must be at least 2 characters');
            return false;
        }
        
        this.clearError(input, errorElement);
        return true;
    }
    
    validateStoreEmail(input) {
        const value = input.value.trim();
        const errorElement = document.getElementById('storeEmailError');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (value === '') {
            this.showError(input, errorElement, 'Store email is required');
            return false;
        }
        
        if (!emailRegex.test(value)) {
            this.showError(input, errorElement, 'Please enter a valid email address');
            return false;
        }
        
        this.clearError(input, errorElement);
        return true;
    }
    
    validateStorePhone(input) {
        const value = input.value.trim();
        const errorElement = document.getElementById('storePhoneError');
        const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
        
        if (value !== '' && !phoneRegex.test(value)) {
            this.showError(input, errorElement, 'Please enter a valid phone number');
            return false;
        }
        
        this.clearError(input, errorElement);
        return true;
    }
    
    validateAdminName(input) {
        const value = input.value.trim();
        const errorElement = document.getElementById('adminNameError');
        
        if (value !== '' && value.length < 2) {
            this.showError(input, errorElement, 'Name must be at least 2 characters');
            return false;
        }
        
        this.clearError(input, errorElement);
        return true;
    }
    
    validateAdminEmail(input) {
        const value = input.value.trim();
        const errorElement = document.getElementById('adminEmailError');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (value !== '' && !emailRegex.test(value)) {
            this.showError(input, errorElement, 'Please enter a valid email address');
            return false;
        }
        
        this.clearError(input, errorElement);
        return true;
    }
    
    validateLowStockThreshold(input) {
        const value = parseInt(input.value);
        const errorElement = document.getElementById('lowStockThresholdError');
        
        if (isNaN(value) || value < 1 || value > 50) {
            this.showError(input, errorElement, 'Low stock threshold must be between 1 and 50');
            return false;
        }
        
        this.clearError(input, errorElement);
        return true;
    }
    
    showError(input, errorElement, message) {
        input.classList.add('error');
        input.classList.remove('success');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
    
    clearError(input, errorElement) {
        input.classList.remove('error');
        input.classList.add('success');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
    
    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.textContent = 'Saving...';
        } else {
            button.disabled = false;
            button.textContent = button.textContent.replace('Saving...', 'Save');
        }
    }
    
    applyDarkMode() {
        // Placeholder for dark mode implementation
        showToast('Dark mode coming soon!', 'info');
        // Reset the toggle for now
        document.getElementById('darkMode').checked = false;
    }
    
    getSetting(group, key, defaultValue = null) {
        return this.settings[group]?.[key] || defaultValue;
    }
    
    async updateSetting(group, key, value) {
        try {
            const settingsRef = dbRef(db, `settings/${group}/${key}`);
            await set(settingsRef, value);
            
            if (this.settings[group]) {
                this.settings[group][key] = value;
            }
            
            return true;
        } catch (error) {
            console.error('Error updating setting:', error);
            return false;
        }
    }
}

// ========================================
// 10. MAIN DASHBOARD INITIALIZATION
// ========================================

class AdminDashboard {
    constructor() {
        this.navigationController = new NavigationController();
        this.dataController = new DataController();
        this.mediaManager = new MediaManager();
        this.productManager = new ProductManager();
        this.orderManager = new OrderManager();
        this.inventoryManager = new InventoryManager();
        this.settingsManager = new SettingsManager();
        this.isInitialized = false;
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load initial data
            await this.dataController.loadDashboardStats();
            
            // Render media manager
            this.mediaManager.renderMediaGrid();
            
            // Setup global event listeners
            this.setupGlobalListeners();
            
            // Hide skeleton loaders
            setTimeout(() => hideSkeletons(), 1000);
            
            this.isInitialized = true;
            showToast('Dashboard loaded successfully', 'success');
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            showToast('Error loading dashboard', 'error');
        }
    }
    
    setupGlobalListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.disabled = true;
                this.dataController.loadDashboardStats();
                setTimeout(() => {
                    refreshBtn.disabled = false;
                    showToast('Dashboard refreshed', 'success');
                }, 1000);
            });
        }
        
        // Chart timeline selector
        const timelineSelect = document.getElementById('chartTimeline');
        if (timelineSelect) {
            timelineSelect.addEventListener('change', (e) => {
                this.updateChartTimeline(e.target.value);
            });
        }
    }
    
    updateChartTimeline(timeline) {
        // Update chart based on selected timeline
        // This would filter data based on timeline
        console.log('Updating chart timeline:', timeline);
        showToast(`Chart updated to ${timeline} view`, 'info');
    }
    
    // Global methods for onclick handlers
    openPendingOrdersPanel() {
        const overlay = document.getElementById('pendingOrdersOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closePendingOrdersPanel() {
        const overlay = document.getElementById('pendingOrdersOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// ========================================
// 7. INITIALIZATION
// ========================================

let dashboardApp;

// Add test function to window for debugging
window.testProductSearch = function() {
    console.log('🧪 Testing product search...');
    console.log('Dashboard app exists:', !!window.dashboardApp);
    console.log('Product manager exists:', !!window.dashboardApp?.productManager);
    console.log('Products loaded:', window.dashboardApp?.productManager?.products?.length || 0);
    
    if (window.dashboardApp?.productManager?.products?.length > 0) {
        console.log('Sample product:', window.dashboardApp.productManager.products[0]);
        // Test search with first product name
        const testName = window.dashboardApp.productManager.products[0].name;
        console.log('Testing search with:', testName);
        window.dashboardApp.productManager.handleSearch(testName);
    } else {
        console.log('❌ No products loaded to test with');
    }
};

function initializeDashboard() {
    dashboardApp = new AdminDashboard();
    window.dashboardApp = dashboardApp;
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Add click outside handler to hide search results
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('searchResultsDropdown');
        const searchContainer = document.querySelector('.products-search');
        
        if (dropdown && searchContainer && !searchContainer.contains(event.target)) {
            if (window.dashboardApp && window.dashboardApp.productManager) {
                window.dashboardApp.productManager.hideSearchResults();
            }
        }
    });
    
    // Make some methods globally available for inline handlers
    window.openPendingOrdersPanel = () => dashboardApp.openPendingOrdersPanel();
    window.closePendingOrdersPanel = () => dashboardApp.closePendingOrdersPanel();
    
    dashboardApp.initialize();
}

// Export for global access
window.AdminDashboard = AdminDashboard;
window.showToast = showToast;
