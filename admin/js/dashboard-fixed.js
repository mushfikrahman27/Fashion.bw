// ============================================
// DASHBOARD MANAGER - FIXED VERSION
// js/dashboard-fixed.js
// ============================================

class DashboardManager {
    constructor() {
        this.data = {
            totalOrders: 0,
            totalProducts: 0,
            totalUsers: 0,
            totalRevenue: 0,
            recentOrders: []
        };
        this.isLoading = false;
        this.error = null;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        console.log('📊 Initializing Dashboard Manager...');
        
        try {
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Start loading
            this.setLoading(true);
            
            // Load all data
            await this.loadAllData();
            
            console.log('✅ Dashboard Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.setError(error.message);
        }
    }

    // ─────────────────────────────────────────
    // WAIT FOR FIREBASE
    // ─────────────────────────────────────────
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                // Check for unified Firebase first, then fallback to regular
                if ((window.unifiedFirebase && window.unifiedFirebase.isReady) || 
                    (window.firebaseDB && typeof window.firebaseDB.collection === 'function')) {
                    console.log('✅ Firebase is ready for dashboard');
                    resolve();
                } else {
                    console.log('⏳ Dashboard waiting for Firebase...');
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // ─────────────────────────────────────────
    // LOAD ALL DATA
    // ─────────────────────────────────────────
    async loadAllData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // Load all data in parallel
            const [ordersData, productsData, usersData] = await Promise.all([
                this.loadOrdersCount(),
                this.loadProductsCount(),
                this.loadUsersCount()
            ]);
            
            // Update data object
            this.data = {
                totalOrders: ordersData.count,
                totalProducts: productsData.count,
                totalUsers: usersData.count,
                totalRevenue: this.calculateRevenue(ordersData.orders),
                recentOrders: ordersData.recentOrders
            };
            
            // Update UI
            this.updateUI();
            
            console.log('✅ Dashboard data loaded:', this.data);
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.setError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    // ─────────────────────────────────────────
    // LOAD ORDERS COUNT
    // ─────────────────────────────────────────
    async loadOrdersCount() {
        try {
            const ordersRef = window.firebaseDB.collection('orders');
            const snapshot = await ordersRef.get();
            
            let count = 0;
            let recentOrders = [];
            
            if (!snapshot.empty) {
                count = snapshot.size;
                
                // Get recent orders (last 10)
                recentOrders = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .slice(-10)
                    .reverse(); // Most recent first
            }
            
            return { count, orders: recentOrders };
            
        } catch (error) {
            console.error('❌ Error loading orders count:', error);
            return { count: 0, orders: [] };
        }
    }

    // ─────────────────────────────────────────
    // LOAD PRODUCTS COUNT
    // ─────────────────────────────────────────
    async loadProductsCount() {
        try {
            const productsRef = window.firebaseDB.collection('products');
            const snapshot = await productsRef.where('active', '==', true).get();
            
            let count = 0;
            
            if (!snapshot.empty) {
                count = snapshot.size;
            }
            
            return { count };
            
        } catch (error) {
            console.error('❌ Error loading products count:', error);
            return { count: 0 };
        }
    }

    // ─────────────────────────────────────────
    // LOAD USERS COUNT
    // ─────────────────────────────────────────
    async loadUsersCount() {
        try {
            const usersRef = window.firebaseDB.collection('users');
            const snapshot = await usersRef.where('isActive', '==', true).get();
            
            let count = 0;
            
            if (!snapshot.empty) {
                count = snapshot.size;
            }
            
            return { count };
            
        } catch (error) {
            console.error('❌ Error loading users count:', error);
            return { count: 0 };
        }
    }

    // ─────────────────────────────────────────
    // CALCULATE REVENUE
    // ─────────────────────────────────────────
    calculateRevenue(orders) {
        return orders.reduce((total, order) => {
            const orderTotal = order.total || 0;
            const orderStatus = order.status || '';
            
            // Only count completed orders
            if (orderStatus === 'delivered' || orderStatus === 'completed') {
                return total + parseFloat(orderTotal);
            }
            
            return total;
        }, 0);
    }

    // ─────────────────────────────────────────
    // UPDATE UI
    // ─────────────────────────────────────────
    updateUI() {
        // Update stat cards
        this.updateStatCard('totalOrders', this.data.totalOrders);
        this.updateStatCard('totalProducts', this.data.totalProducts);
        this.updateStatCard('totalUsers', this.data.totalUsers);
        this.updateStatCard('totalRevenue', this.data.totalRevenue);
        
        // Update recent orders table
        this.updateOrdersTable();
        
        // Remove any error messages
        this.clearError();
    }

    // ─────────────────────────────────────────
    // UPDATE STAT CARD
    // ─────────────────────────────────────────
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animate the number change
            const currentValue = parseFloat(element.textContent) || 0;
            const increment = value - currentValue;
            
            if (increment !== 0) {
                this.animateNumber(element, currentValue, value, 500);
            } else {
                element.textContent = this.formatNumber(value);
            }
        }
    }

    // ─────────────────────────────────────────
    // ANIMATE NUMBER
    // ─────────────────────────────────────────
    animateNumber(element, start, end, duration) {
        const startTime = Date.now();
        const difference = end - start;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (difference * progress);
            element.textContent = this.formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // ─────────────────────────────────────────
    // FORMAT NUMBER
    // ─────────────────────────────────────────
    formatNumber(num) {
        if (typeof num !== 'number') return '0';
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        } else {
            return num.toFixed(2);
        }
    }

    // ─────────────────────────────────────────
    // UPDATE ORDERS TABLE
    // ─────────────────────────────────────────
    updateOrdersTable() {
        const tableBody = document.getElementById('recentOrdersTable');
        if (!tableBody) return;
        
        if (this.data.recentOrders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center no-data">
                        <i class="fas fa-inbox"></i>
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }
        
        const ordersHTML = this.data.recentOrders.map(order => `
            <tr>
                <td>
                    <a href="#orders" class="order-link" onclick="window.dashboardManager.viewOrder('${order.id}')">
                        #${order.id.slice(-6)}
                    </a>
                </td>
                <td>${this.escapeHtml(order.customerName || 'Guest')}</td>
                <td>$${this.formatNumber(order.total || 0)}</td>
                <td>
                    <span class="badge badge-${this.getStatusClass(order.status)}">
                        ${this.capitalizeFirst(order.status || 'Pending')}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.dashboardManager.viewOrder('${order.id}')">
                        View Details
                    </button>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = ordersHTML;
    }

    // ─────────────────────────────────────────
    // GET STATUS CLASS
    // ─────────────────────────────────────────
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'processing': 'info',
            'shipped': 'primary',
            'delivered': 'success',
            'cancelled': 'danger'
        };
        return statusMap[status] || 'warning';
    }

    // ─────────────────────────────────────────
    // CAPITALIZE FIRST
    // ─────────────────────────────────────────
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ─────────────────────────────────────────
    // ESCAPE HTML
    // ─────────────────────────────────────────
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ─────────────────────────────────────────
    // SET LOADING
    // ─────────────────────────────────────────
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        // Update loading states
        const loadingElements = document.querySelectorAll('.loading-placeholder');
        loadingElements.forEach(el => el.remove());
        
        if (isLoading) {
            // Add loading placeholders
            this.addLoadingPlaceholders();
        }
    }

    // ─────────────────────────────────────────
    // ADD LOADING PLACEHOLDERS
    // ─────────────────────────────────────────
    addLoadingPlaceholders() {
        const statCards = document.querySelectorAll('.stat-card .number');
        statCards.forEach(card => {
            card.classList.add('loading-placeholder');
            card.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        
        const ordersTable = document.getElementById('recentOrdersTable');
        if (ordersTable) {
            ordersTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading orders...
                    </td>
                </tr>
            `;
        }
    }

    // ─────────────────────────────────────────
    // SET ERROR
    // ─────────────────────────────────────────
    setError(message) {
        this.error = message;
        this.showErrorMessage(message);
    }

    // ─────────────────────────────────────────
    // SHOW ERROR MESSAGE
    // ─────────────────────────────────────────
    showErrorMessage(message) {
        // Remove existing error messages
        this.clearError();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'dashboard-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="window.dashboardManager.clearError()" class="btn-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Insert at the top of dashboard section
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.insertBefore(errorDiv, dashboardSection.querySelector('.section-body'));
        }
    }

    // ─────────────────────────────────────────
    // CLEAR ERROR
    // ─────────────────────────────────────────
    clearError() {
        const errorElements = document.querySelectorAll('.dashboard-error');
        errorElements.forEach(el => el.remove());
        this.error = null;
    }

    // ─────────────────────────────────────────
    // VIEW ORDER DETAILS
    // ─────────────────────────────────────────
    viewOrder(orderId) {
        console.log('Viewing order details:', orderId);
        // Navigate to orders section and highlight the order
        const ordersNavItem = document.querySelector('[data-section="orders"]');
        if (ordersNavItem) {
            ordersNavItem.click();
        }
    }

    // ─────────────────────────────────────────
    // UPDATE ORDERS COUNT (FOR REAL-TIME)
    // ─────────────────────────────────────────
    updateOrdersCount(count) {
        const element = document.getElementById('totalOrders');
        if (element) {
            const currentCount = parseInt(element.textContent) || 0;
            if (currentCount !== count) {
                this.animateNumber(element, currentCount, count, 500);
                console.log('📦 Orders count updated:', count);
            }
        }
    }

    // ─────────────────────────────────────────
    // UPDATE PRODUCTS COUNT (FOR REAL-TIME)
    // ─────────────────────────────────────────
    updateProductsCount(count) {
        const element = document.getElementById('totalProducts');
        if (element) {
            const currentCount = parseInt(element.textContent) || 0;
            if (currentCount !== count) {
                this.animateNumber(element, currentCount, count, 500);
                console.log('📦 Products count updated:', count);
            }
        }
    }

    // ─────────────────────────────────────────
    // UPDATE USERS COUNT (FOR REAL-TIME)
    // ─────────────────────────────────────────
    updateUsersCount(count) {
        const element = document.getElementById('totalUsers');
        if (element) {
            const currentCount = parseInt(element.textContent) || 0;
            if (currentCount !== count) {
                this.animateNumber(element, currentCount, count, 500);
                console.log('👥 Users count updated:', count);
            }
        }
    }

    // ─────────────────────────────────────────
    // UPDATE REVENUE (FOR REAL-TIME)
    // ─────────────────────────────────────────
    updateRevenue(revenue) {
        const element = document.getElementById('totalRevenue');
        if (element) {
            const currentRevenue = parseFloat(element.textContent.replace(/[^0-9.]/g, '')) || 0;
            if (Math.abs(currentRevenue - revenue) > 0.01) {
                this.animateNumber(element, currentRevenue, revenue, 500);
                console.log('💰 Revenue updated:', revenue);
            }
        }
    }

    // ─────────────────────────────────────────
    // UPDATE ORDERS TABLE (FOR REAL-TIME)
    // ─────────────────────────────────────────
    updateOrdersTable(orders) {
        const tableBody = document.getElementById('recentOrdersTable');
        if (!tableBody) return;
        
        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center no-data">
                        <i class="fas fa-inbox"></i>
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }
        
        const ordersHTML = orders.map(order => `
            <tr>
                <td>
                    <a href="#orders" class="order-link" onclick="window.dashboardManager.viewOrder('${order.id}')">
                        #${order.id.slice(-6)}
                    </a>
                </td>
                <td>${this.escapeHtml(order.customerName || 'Guest')}</td>
                <td>$${this.formatNumber(order.total || 0)}</td>
                <td>
                    <span class="badge badge-${this.getStatusClass(order.status)}">
                        ${this.capitalizeFirst(order.status || 'Pending')}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.dashboardManager.viewOrder('${order.id}')">
                        View Details
                    </button>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = ordersHTML;
        console.log('📋 Orders table updated with', orders.length, 'orders');
    }

    // ─────────────────────────────────────────
    // REFRESH DATA (FOR REAL-TIME UPDATES)
    // ─────────────────────────────────────────
    async refresh() {
        console.log('🔄 Refreshing dashboard data...');
        await this.loadAllData();
    }
}

// Initialize globally
window.dashboardManager = new DashboardManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.dashboardManager) {
        window.dashboardManager.init();
    }
});
