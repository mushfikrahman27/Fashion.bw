// ============================================
// DASHBOARD REAL-TIME UPDATES
// js/dashboard-new.js
// ============================================

import { getCollectionRef } from './firebase-paths.js';
import { registerFirestoreListener } from './utils/cleanup-manager.js';
import { showToast, showError } from './utils/ui-helpers.js';
import { logUserAction } from './utils/audit-log.js';

class DashboardManager {
    constructor() {
        this.stats = {
            totalOrders: 0,
            totalProducts: 0,
            totalUsers: 0,
            totalRevenue: 0
        };
        this.recentOrders = [];
    }
        this.recentOrders = [];
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) {
            console.warn('Firebase not ready');
            return;
        }
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        try {
            // Load dashboard stats
            const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
                get(ref(window.firebaseDB, 'orders')),
                get(ref(window.firebaseDB, 'products')),
                get(ref(window.firebaseDB, 'users'))
            ]);

            // Calculate stats
            if (ordersSnap.exists()) {
                const orders = Object.values(ordersSnap.val());
                this.stats.totalOrders = orders.length;
                this.stats.totalRevenue = orders.reduce((sum, order) => {
                    return sum + (order.total || 0);
                }, 0);
                
                // Get recent orders (last 10)
                this.recentOrders = orders
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .slice(0, 10);
            }

            if (productsSnap.exists()) {
                this.stats.totalProducts = Object.keys(productsSnap.val()).length;
            }

            if (usersSnap.exists()) {
                this.stats.totalUsers = Object.keys(usersSnap.val()).length;
            }

            this.render();
        } catch (err) {
            console.error('Dashboard load error:', err);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    // ─────────────────────────────────────────
    // RENDER DASHBOARD
    // ─────────────────────────────────────────
    render() {
        const el = document.getElementById('dashboardSection');
        if (!el) return;

        el.innerHTML = `
            <div class="section-header">
                <div class="header-content">
                    <h2 class="section-title">📊 Dashboard</h2>
                    <p class="section-subtitle">Business overview and statistics</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="dashboard.refresh()">
                        <i class="fas fa-sync"></i>
                        Refresh
                    </button>
                </div>
            </div>

            <div class="section-body">
                <!-- Stats Cards -->
                <div class="dashboard-stats-grid">
                    <div class="dashboard-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats.totalOrders}</div>
                            <div class="stat-label">Total Orders</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats.totalProducts}</div>
                            <div class="stat-label">Total Products</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">TK ${this.stats.totalRevenue.toLocaleString()}</div>
                            <div class="stat-label">Total Revenue</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats.totalUsers}</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                </div>

                <!-- Recent Orders -->
                <div class="dashboard-recent-orders">
                    <div class="dashboard-section-header">
                        <h3>📦 Recent Orders</h3>
                        <button class="btn btn-secondary" onclick="window.location.href='#orders'">
                            View All Orders
                        </button>
                    </div>
                    
                    <div class="recent-orders-list">
                        ${this.renderRecentOrders()}
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentOrders() {
        if (this.recentOrders.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>No orders yet</h3>
                    <p>Orders will appear here when customers make purchases</p>
                </div>
            `;
        }

        return this.recentOrders.map(order => {
            const statusColors = {
                pending: '#f59e0b',
                processing: '#3b82f6',
                shipped: '#8b5cf6',
                delivered: '#10b981',
                cancelled: '#ef4444'
            };

            const statusIcons = {
                pending: '🕐',
                processing: '⚙️',
                shipped: '🚚',
                delivered: '✅',
                cancelled: '❌'
            };

            return `
                <div class="recent-order-card">
                    <div class="order-info">
                        <div class="order-id">#${order.id ? order.id.slice(-6).toUpperCase() : 'UNKNOWN'}</div>
                        <div class="order-customer">${order.customerName || 'Unknown Customer'}</div>
                    </div>
                    <div class="order-details">
                        <div class="order-amount">TK ${(order.total || 0).toLocaleString()}</div>
                        <div class="order-status" style="background: ${statusColors[order.status] || '#6b7280'}20; color: ${statusColors[order.status] || '#6b7280'}">
                            ${statusIcons[order.status] || '📋'} ${order.status || 'Unknown'}
                        </div>
                    </div>
                    <div class="order-time">${this.timeAgo(order.timestamp)}</div>
                </div>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────
    async refresh() {
        this.showToast('Refreshing dashboard...', 'success');
        await this.init();
    }

    timeAgo(ts) {
        if (!ts) return '';
        const diff = Date.now() - ts;
        const m = Math.floor(diff / 60000);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (m < 1)  return 'just now';
        if (m < 60) return `${m}m ago`;
        if (h < 24) return `${h}h ago`;
        return `${d}d ago`;
    }

    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `order-toast ${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
    }
}

// Initialize dashboard
window.dashboard = new AdminDashboard();
document.addEventListener('DOMContentLoaded', () => window.dashboard.init());
