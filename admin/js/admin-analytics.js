// ============================================
// ADMIN ANALYTICS DASHBOARD MANAGER
// ============================================
class AdminAnalytics {
    constructor() {
        this.timeRange = '7d';
        this.analyticsData = { views: {}, cartAdds: {}, purchases: {} };
    }

    getTimeFilter() {
        const now = Date.now();
        const filters = {
            '24h': now - (24 * 60 * 60 * 1000),
            '7d':  now - (7 * 24 * 60 * 60 * 1000),
            '30d': now - (30 * 24 * 60 * 60 * 1000),
            'all': 0
        };
        return filters[this.timeRange] || filters['7d'];
    }

    async loadAnalytics() {
        if (!window.firebaseDB) {
            console.warn('Firebase not ready');
            return;
        }

        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const timeFilter = this.getTimeFilter();

        try {
            const [viewsSnap, cartSnap, purchaseSnap] = await Promise.all([
                get(ref(window.firebaseDB, 'products-analytics/product-views')),
                get(ref(window.firebaseDB, 'products-analytics/cart-additions')),
                get(ref(window.firebaseDB, 'products-analytics/purchases'))
            ]);

            this.analyticsData.views    = viewsSnap.exists()    ? this.aggregate(viewsSnap.val(), timeFilter) : {};
            this.analyticsData.cartAdds = cartSnap.exists()     ? this.aggregate(cartSnap.val(), timeFilter) : {};
            this.analyticsData.purchases = purchaseSnap.exists() ? this.aggregate(purchaseSnap.val(), timeFilter, true) : {};

            this.render();
        } catch (err) {
            console.error('Analytics load error:', err);
        }
    }

    aggregate(data, timeFilter, includeRevenue = false) {
        const result = {};
        Object.values(data)
            .filter(item => item.timestamp >= timeFilter)
            .forEach(item => {
                if (!result[item.productId]) {
                    result[item.productId] = { productId: item.productId, count: 0, revenue: 0, users: new Set() };
                }
                result[item.productId].count++;
                result[item.productId].users.add(item.userId);
                if (includeRevenue && item.revenue) result[item.productId].revenue += item.revenue;
            });
        return result;
    }

    getProductName(productId) {
        if (window.mainProductCatalog && window.mainProductCatalog.products) {
            const p = window.mainProductCatalog.products.find(p => p.id === productId);
            if (p) return p.name;
        }
        return productId;
    }

    renderList(containerId, data, statsFn) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const sorted = Object.values(data).sort((a, b) => b.count - a.count).slice(0, 10);
        if (sorted.length === 0) {
            el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No data yet</p>';
            return;
        }
        el.innerHTML = sorted.map((item, i) => `
            <div class="analytics-item">
                <span class="rank">#${i + 1}</span>
                <div class="product-info">
                    <div class="product-name">${this.getProductName(item.productId)}</div>
                    <div class="analytics-stats">${statsFn(item)}</div>
                </div>
            </div>
        `).join('');
    }

    render() {
        // Most Viewed
        this.renderList('mostViewedProducts', this.analyticsData.views, item =>
            `<span class="stat">👁️ ${item.count} views</span><span class="stat">👥 ${item.users.size} users</span>` 
        );

        // Most Cart Additions
        this.renderList('mostCartProducts', this.analyticsData.cartAdds, item =>
            `<span class="stat">🛒 ${item.count} additions</span><span class="stat">👥 ${item.users.size} users</span>` 
        );

        // Most Purchased (sort by revenue)
        const el = document.getElementById('mostPurchasedProducts');
        if (el) {
            const sorted = Object.values(this.analyticsData.purchases).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
            el.innerHTML = sorted.length === 0
                ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No data yet</p>'
                : sorted.map((item, i) => `
                    <div class="analytics-item">
                        <span class="rank">#${i + 1}</span>
                        <div class="product-info">
                            <div class="product-name">${this.getProductName(item.productId)}</div>
                            <div class="analytics-stats">
                                <span class="stat">💰 TK ${item.revenue.toLocaleString()}</span>
                                <span class="stat">🛒 ${item.count} sales</span>
                                <span class="stat">👥 ${item.users.size} buyers</span>
                            </div>
                        </div>
                    </div>`).join('');
        }

        // Summary
        const summary = document.getElementById('analyticsSummary');
        if (summary) {
            const totalViews     = Object.values(this.analyticsData.views).reduce((s, i) => s + i.count, 0);
            const totalCart      = Object.values(this.analyticsData.cartAdds).reduce((s, i) => s + i.count, 0);
            const totalPurchases = Object.values(this.analyticsData.purchases).reduce((s, i) => s + i.count, 0);
            const totalRevenue   = Object.values(this.analyticsData.purchases).reduce((s, i) => s + i.revenue, 0);
            summary.innerHTML = `
                <div class="summary-item"><div class="summary-label">Total Views</div><div class="summary-value">${totalViews.toLocaleString()}</div></div>
                <div class="summary-item"><div class="summary-label">Cart Additions</div><div class="summary-value">${totalCart.toLocaleString()}</div></div>
                <div class="summary-item"><div class="summary-label">Total Purchases</div><div class="summary-value">${totalPurchases.toLocaleString()}</div></div>
                <div class="summary-item"><div class="summary-label">Total Revenue</div><div class="summary-value">TK ${totalRevenue.toLocaleString()}</div></div>
            `;
        }
    }
}

window.adminAnalytics = new AdminAnalytics();

async function refreshAnalytics() {
    const btn = document.querySelector('#analytics-section .btn-primary');
    if (btn) btn.textContent = '⏳ Loading...';
    await window.adminAnalytics.loadAnalytics();
    if (btn) btn.textContent = '🔄 Refresh';
}

function changeAnalyticsTimeRange(range) {
    window.adminAnalytics.timeRange = range;
    refreshAnalytics();
}

// Auto-load when page opens
document.addEventListener('DOMContentLoaded', () => refreshAnalytics());
