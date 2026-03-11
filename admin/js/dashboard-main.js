// admin/js/dashboard-main.js - CONSOLIDATED ADMIN DASHBOARD ARCHITECTURE
// This is now the single source of truth for admin dashboard functionality

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
   2. GLOBAL STATE & UTILS
   ======================================== */

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
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
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
   3. NAVIGATION & ROUTING
   ======================================== */

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
        
        // Messages nav (placeholder)
        document.getElementById('navMessages')?.addEventListener('click', () => {
            showToast('Messaging system coming soon', 'info');
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
        document.querySelectorAll('.section-content').forEach(el => {
            el.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        } else {
            // For now, most sections will show dashboard
            // This will be expanded as sections are built
            this.showDashboardView();
        }
        
        // Update page title
        this.updatePageTitle(section);
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
            settings: 'Settings'
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
   4. DATA LOADING & ANALYTICS
   ======================================== */

class DataController {
    constructor() {
        this.listeners = new Map();
        this.cache = new Map();
    }
    
    async loadDashboardStats() {
        try {
            // Load visitors data
            const visitsRef = dbRef(db, 'visits');
            onValue(visitsRef, (snapshot) => {
                const visits = snapshot.val() || {};
                this.cache.set('visits', visits);
                this.updateVisitorStats(visits);
            });
            
            // Load orders data
            const ordersRef = dbRef(db, 'orders');
            onValue(ordersRef, (snapshot) => {
                const orders = snapshot.val() || {};
                const normalizedOrders = Object.entries(orders).map(([key, order]) => 
                    normalizeOrder(order, key)
                );
                dashboardState.orders = normalizedOrders;
                this.cache.set('orders', normalizedOrders);
                this.updateOrderStats(normalizedOrders);
                this.updateRecentOrders(normalizedOrders);
            });
            
            // Load products data
            const productsRef = dbRef(db, 'products');
            onValue(productsRef, (snapshot) => {
                const products = snapshot.val() || {};
                dashboardState.products = Object.entries(products).map(([key, product]) => ({
                    ...product,
                    id: key
                }));
                this.cache.set('products', dashboardState.products);
                this.updateProductStats(dashboardState.products);
                this.updatePerformanceChart(dashboardState.products);
            });
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showToast('Error loading dashboard data', 'error');
        }
    }
    
    updateVisitorStats(visits) {
        const totalVisits = Object.keys(visits).length;
        const visitsElement = document.getElementById('totalVisits');
        if (visitsElement) {
            animateValue(visitsElement, 0, totalVisits, 1000);
        }
    }
    
    updateOrderStats(orders) {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
        
        // Update order count
        const ordersElement = document.getElementById('totalOrders');
        if (ordersElement) {
            animateValue(ordersElement, 0, totalOrders, 1000);
        }
        
        // Update revenue
        const revenueElement = document.getElementById('totalRevenue');
        if (revenueElement) {
            animateValue(revenueElement, 0, totalRevenue, 1000);
        }
    }
    
    updateProductStats(products) {
        // Low stock alerts
        const lowStockProducts = products.filter(p => p.stock <= 5);
        const lowStockElement = document.getElementById('lowStockCount');
        if (lowStockElement) {
            lowStockElement.textContent = lowStockProducts.length;
        }
        
        // Top product
        const topProduct = products.reduce((top, product) => 
            (product.sales || 0) > (top.sales || 0) ? product : top, 
            products[0] || {}
        );
        const topProductElement = document.getElementById('topProductName');
        if (topProductElement && topProduct.name) {
            topProductElement.textContent = topProduct.name;
        }
    }
    
    updateRecentOrders(orders) {
        const recentOrders = orders
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);
            
        const container = document.getElementById('recentOrdersList');
        if (container) {
            container.innerHTML = recentOrders.map(order => `
                <div class="order-item">
                    <div class="order-info">
                        <h4>${order.orderId}</h4>
                        <p>${order.customer.name}</p>
                        <small>৳${order.totals.total}</small>
                    </div>
                    <span class="badge ${this.getStatusBadgeClass(order.status)}">${order.status}</span>
                </div>
            `).join('');
        }
    }
    
    updatePerformanceChart(products) {
        const ctx = document.getElementById('productPerformanceChart');
        if (!ctx) return;
        
        // Destroy existing chart if any
        if (dashboardState.performanceChart) {
            dashboardState.performanceChart.destroy();
        }
        
        // Prepare data
        const topProducts = products
            .sort((a, b) => (b.sales || 0) - (a.sales || 0))
            .slice(0, 5);
            
        dashboardState.performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    label: 'Sales',
                    data: topProducts.map(p => p.sales || 0),
                    backgroundColor: 'rgba(212, 175, 55, 0.6)',
                    borderColor: 'rgba(212, 175, 55, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    getStatusBadgeClass(status) {
        const classes = {
            pending: 'badge-warning',
            processing: 'badge-info',
            shipped: 'badge-primary',
            delivered: 'badge-success',
            cancelled: 'badge-danger'
        };
        return classes[status] || 'badge-secondary';
    }
}

// ========================================
   5. MEDIA MANAGER
   ======================================== */

class MediaManager {
    constructor() {
        this.mediaSlots = [
            { id: 'hero_banner', name: 'Hero Banner' },
            { id: 'featured_1', name: 'Featured Product 1' },
            { id: 'featured_2', name: 'Featured Product 2' },
            { id: 'category_banner', name: 'Category Banner' },
            { id: 'promotion', name: 'Promotion Banner' }
        ];
        this.currentSlot = null;
        this.setupMediaHandlers();
    }
    
    setupMediaHandlers() {
        const uploadBtn = document.getElementById('mediaUploadBtn');
        const fileInput = document.getElementById('mediaFile');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.handleUpload());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }
    
    renderMediaGrid() {
        const grid = document.getElementById('mediaManagerGrid');
        if (!grid) return;
        
        grid.innerHTML = this.mediaSlots.map(slot => `
            <div class="media-slot" onclick="window.dashboardApp.mediaManager.selectSlot('${slot.id}', '${slot.name}')">
                <div class="media-slot-content">
                    <div class="media-slot-icon">📷</div>
                    <h4>${slot.name}</h4>
                    <p>Click to update</p>
                </div>
            </div>
        `).join('');
    }
    
    selectSlot(slotId, slotName) {
        this.currentSlot = { id: slotId, name: slotName };
        
        const uploadZone = document.getElementById('mediaUploadZone');
        const titleElement = document.getElementById('currentSlotTitle');
        
        if (uploadZone) {
            uploadZone.style.display = 'block';
            uploadZone.dataset.slotId = slotId;
        }
        
        if (titleElement) {
            titleElement.textContent = `Updating ${slotName}`;
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB', 'error');
            return;
        }
    }
    
    async handleUpload() {
        if (!this.currentSlot) {
            showToast('Please select a slot first', 'error');
            return;
        }
        
        const fileInput = document.getElementById('mediaFile');
        const file = fileInput?.files[0];
        
        if (!file) {
            showToast('Please select a file', 'error');
            return;
        }
        
        const uploadBtn = document.getElementById('mediaUploadBtn');
        const statusElement = document.getElementById('mediaUploadStatus');
        
        try {
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';
            
            if (statusElement) {
                statusElement.textContent = 'Uploading...';
                statusElement.style.color = 'var(--primary)';
            }
            
            // Upload to Firebase Storage
            const storagePath = `media/${this.currentSlot.id}/${Date.now()}_${file.name}`;
            const storageReference = storageRef(storage, storagePath);
            await uploadBytes(storageReference, file);
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageReference);
            
            // Update database
            await update(dbRef(db, `media/${this.currentSlot.id}`), {
                url: downloadURL,
                name: file.name,
                uploadedAt: Date.now(),
                uploadedBy: currentUserId
            });
            
            showToast('Media uploaded successfully', 'success');
            
            // Reset form
            fileInput.value = '';
            this.currentSlot = null;
            
            if (statusElement) {
                statusElement.textContent = 'Upload successful!';
                statusElement.style.color = 'var(--success)';
            }
            
            setTimeout(() => {
                const uploadZone = document.getElementById('mediaUploadZone');
                if (uploadZone) {
                    uploadZone.style.display = 'none';
                }
            }, 2000);
            
        } catch (error) {
            console.error('Upload error:', error);
            if (statusElement) {
                statusElement.textContent = 'Upload failed. Please try again.';
                statusElement.style.color = 'var(--danger)';
            }
            showToast('Upload failed', 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload & Set Live';
        }
    }
}

// ========================================
   6. MAIN DASHBOARD INITIALIZATION
   ======================================== */

class AdminDashboard {
    constructor() {
        this.navigationController = new NavigationController();
        this.dataController = new DataController();
        this.mediaManager = new MediaManager();
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
   7. INITIALIZATION
   ======================================== */

let dashboardApp;

function initializeDashboard() {
    dashboardApp = new AdminDashboard();
    window.dashboardApp = dashboardApp;
    
    // Make some methods globally available for inline handlers
    window.openPendingOrdersPanel = () => dashboardApp.openPendingOrdersPanel();
    window.closePendingOrdersPanel = () => dashboardApp.closePendingOrdersPanel();
    
    dashboardApp.initialize();
}

// Export for global access
window.AdminDashboard = AdminDashboard;
window.showToast = showToast;
