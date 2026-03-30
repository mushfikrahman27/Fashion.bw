// ============================================
// DASHBOARD REAL-TIME UPDATES
// js/dashboard.js
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

    async init() {
        try {
            // A. VISITORS DATA
            const visitsRef = getCollectionRef('visits');
            registerFirestoreListener(visitsRef, (snapshot) => {
                const visits = snapshot.docs.map(doc => doc.data());
                const total = visits.length;

                const el = document.getElementById('totalVisitors');
                const current = parseInt(el.innerText.replace(/,/g, '')) || 0;
                animateValue(el, current, total, 1000);

                // Simple Trend Calculation (Today vs Yesterday)
                calculateVisitorTrend(visits);
            });

            // B. ORDERS DATA
            const ordersRef = getCollectionRef('orders');
            registerFirestoreListener(ordersRef, (snapshot) => {
                const orders = snapshot.docs.map(doc => normalizeOrder(doc.data(), doc.id));
                this.recentOrders = orders;

                // Build sales map for chart
                const productSalesMap = {};
                orders.forEach(o => {
                    const items = o.items || [];
                    items.forEach(it => {
                        if (it.productId) {
                            const key = String(it.productId);
                            productSalesMap[key] = (productSalesMap[key] || 0) + (it.qty || 1);
                        }
                    });
                });

                // Update Stat Card
                const orderEl = document.getElementById('totalOrders');
                const currentOrders = parseInt(orderEl.innerText.replace(/,/g, '')) || 0;
                animateValue(orderEl, currentOrders, orders.length, 1000);

                // Update Pending Card
                const pendingRef = orders.filter(o => (o.status || '').toLowerCase() === 'pending');
                document.getElementById('pendingOrders').innerText = pendingRef.length;

                // Progress Bar (Completed / Total)
                const completedCount = orders.filter(o => (o.status || '').toLowerCase() === 'archived').length;
                const progress = orders.length > 0 ? (completedCount / orders.length) * 100 : 0;
                document.getElementById('orderStatusProgress').style.width = `${progress}%`;

                hideSkeletons();
            });

            // C. ANALYTICS (Top Products & Chart)
            const analyticsRef = getCollectionRef('product_analytics');
            registerFirestoreListener(analyticsRef, (snapshot) => {
                const list = snapshot.docs.map(doc => doc.data());

                renderTopLists(list);
                renderPerformanceChart(list);
                updatePriorityAlerts(list);
            });
        } catch (error) {
            showError('Error initializing dashboard:', error);
        }
    }
}

let performanceChart = null;

// ORDER SCHEMA NORMALIZATION - Phase 4 Compatibility
function normalizeOrder(rawOrder, orderKey) {
    // Handle both old and new order schemas
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

    // Normalize items array
    if (rawOrder.items && Array.isArray(rawOrder.items)) {
        // New schema: items array with detailed objects
        normalized.items = rawOrder.items.map(item => ({
            productId: item.productId || item.id || "",
            name: item.name || item.productName || "",
            price: parseFloat(item.price) || 0,
            qty: parseInt(item.qty || item.quantity || 1),
            selectedSize: item.selectedSize || item.size || "N/A",
            color: item.color || ""
        }));
    } else if (rawOrder.productName) {
        // Old schema: single product
        normalized.items = [{
            productId: rawOrder.productId || "",
            name: rawOrder.productName || rawOrder.name || "",
            price: parseFloat(rawOrder.price) || 0,
            qty: parseInt(rawOrder.quantity || rawOrder.qty || 1),
            selectedSize: rawOrder.size || rawOrder.selectedSize || "N/A",
            color: rawOrder.color || ""
        }];
    }

    // Normalize totals
    const computedSubtotal = normalized.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    if (rawOrder.totals) {
        // New schema: totals object
        normalized.totals = {
            subtotal: rawOrder.totals.subtotal ?? computedSubtotal,
            deliveryCharge: rawOrder.totals.deliveryCharge ?? 0,
            total: rawOrder.totals.total ?? computedSubtotal
        };
    } else {
        // Old schema or missing totals
        normalized.totals = {
            subtotal: rawOrder.subtotal ?? computedSubtotal,
            deliveryCharge: rawOrder.deliveryCharge ?? 0,
            total: rawOrder.total ?? computedSubtotal
        };
    }

    return normalized;
}

// Animated count-up helper
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

// Skeleton loader hider
function hideSkeletons() {
    document.querySelectorAll('.skeleton-list, .skeleton').forEach(el => el.style.display = 'none');
}

/** ════════════════════════════════════════════════════
    3. DATA LISTENERS (Firebase Core)
    ════════════════════════════════════════════════════ */
function loadDashboardStats() {
    // A. VISITORS DATA
    const visitsRef = dbRef(db, 'visits');
    onValue(visitsRef, (snapshot) => {
        const val = snapshot.val() || {};
        const visits = Object.values(val);
        const total = visits.length;

        const el = document.getElementById('totalVisitors');
        const current = parseInt(el.innerText.replace(/,/g, '')) || 0;
        animateValue(el, current, total, 1000);

        // Simple Trend Calculation (Today vs Yesterday)
        calculateVisitorTrend(visits);
    });

    // B. ORDERS DATA
    const ordersRef = dbRef(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const orders = Object.entries(data).map(([id, o]) => normalizeOrder(o, id));
        latestOrders = orders;

        // Build sales map for chart
        productSalesMap = {};
        orders.forEach(o => {
            const items = o.items || [];
            items.forEach(it => {
                if (it.productId) {
                    const key = String(it.productId);
                    productSalesMap[key] = (productSalesMap[key] || 0) + (it.qty || 1);
                }
            });
        });

        // Update Stat Card
        const orderEl = document.getElementById('totalOrders');
        const currentOrders = parseInt(orderEl.innerText.replace(/,/g, '')) || 0;
        animateValue(orderEl, currentOrders, orders.length, 1000);

        // Update Pending Card
        const pendingRef = orders.filter(o => (o.status || '').toLowerCase() === 'pending');
        document.getElementById('pendingOrders').innerText = pendingRef.length;

        // Progress Bar (Completed / Total)
        const completedCount = orders.filter(o => (o.status || '').toLowerCase() === 'archived').length;
        const progress = orders.length > 0 ? (completedCount / orders.length) * 100 : 0;
        document.getElementById('orderStatusProgress').style.width = `${progress}%`;

        hideSkeletons();
    });

    // C. ANALYTICS (Top Products & Chart)
    const analyticsRef = dbRef(db, 'product_analytics');
    onValue(analyticsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.values(data);

        renderTopLists(list);
        renderPerformanceChart(list);
        updatePriorityAlerts(list);
    });
}

/** ════════════════════════════════════════════════════
    4. UI RENDERING LOGIC
    ════════════════════════════════════════════════════ */

function calculateVisitorTrend(visits) {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);

    const todayCount = visits.filter(v => v.timestamp >= todayStart).length;
    const yesterdayCount = visits.filter(v => v.timestamp >= yesterdayStart && v.timestamp < todayStart).length;

    const trendValEl = document.getElementById('visitorsTrendVal');
    const trendContainer = document.getElementById('visitorsTrend');

    if (yesterdayCount === 0) {
        trendValEl.innerText = todayCount > 0 ? '+100%' : '0%';
    } else {
        const perc = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
        trendValEl.innerText = `${perc >= 0 ? '+' : ''}${perc}%`;
        trendContainer.className = `card-trend ${perc >= 0 ? 'trend-up' : 'trend-down'}`;
    }
}

function renderTopLists(list) {
    const topViews = [...list].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const topCarts = [...list].sort((a, b) => (b.carts || 0) - (a.carts || 0)).slice(0, 5);

    document.getElementById('topViewedProducts').innerHTML = topViews.map((p, i) => {
        const views = p.views || 0;
        const sales = productSalesMap[String(p.productId)] || 0;
        const conv = views > 0 ? ((sales / views) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td>#${i + 1}</td>
                <td><strong>${p.productName || 'Unnamed'}</strong></td>
                <td>${views.toLocaleString()}</td>
                <td><span class="badge ${conv > 5 ? 'success' : 'muted'}">${conv}%</span></td>
            </tr>
        `;
    }).join('');

    document.getElementById('topCartProducts').innerHTML = topCarts.map((p, i) => {
        const carts = p.carts || 0;
        const sales = productSalesMap[String(p.productId)] || 0;
        const dropoff = carts > 0 ? (100 - (sales / carts) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td>#${i + 1}</td>
                <td><strong>${p.productName || 'Unnamed'}</strong></td>
                <td>${carts.toLocaleString()}</td>
                <td><span class="trend-down">${dropoff}% drop</span></td>
            </tr>
        `;
    }).join('');
}

function renderPerformanceChart(list) {
    const ctx = document.getElementById('productPerformanceChart');
    if (!ctx) return;

    // Filter top 7 by views for clarity
    const data = [...list].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 7);

    const labels = data.map(p => p.productName ? (p.productName.length > 12 ? p.productName.substring(0, 12) + '..' : p.productName) : 'N/A');
    const views = data.map(p => p.views || 0);
    const conversions = data.map(p => productSalesMap[String(p.productId)] || 0);

    if (performanceChart) {
        performanceChart.data.labels = labels;
        performanceChart.data.datasets[0].data = views;
        performanceChart.data.datasets[1].data = conversions;
        performanceChart.update();
        return;
    }

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Views (Clicks)',
                    data: views,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Conversions (Sales)',
                    data: conversions,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxPadding: 10 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updatePriorityAlerts(list) {
    const atRisk = list.filter(p => (p.views || 0) > 20 && (productSalesMap[String(p.productId)] || 0) === 0);
    const container = document.getElementById('atRiskProducts');
    document.getElementById('alertCount').innerText = atRisk.length;

    if (atRisk.length === 0) {
        container.innerHTML = '<div class="empty-state">No critical alerts today.</div>';
        return;
    }

    container.innerHTML = atRisk.map(p => `
        <div class="alert-item">
            <div class="alert-content">
                <h4>High View / Zero Sales</h4>
                <p><strong>${p.productName}</strong> has ${p.views} views but 0 sales.</p>
            </div>
            <button class="btn-alert">Fix Now</button>
        </div>
    `).join('');
}

/** ════════════════════════════════════════════════════
    5. INTERACTIVE COMPONENTS (Panels & Media)
    ════════════════════════════════════════════════════ */

// Pending Orders Slide-in
window.openPendingOrdersPanel = function () {
    const pending = latestOrders.filter(o => (o.status || '').toLowerCase() === 'pending');
    const container = document.getElementById('pendingOrdersList');
    const overlay = document.getElementById('pendingOrdersOverlay');

    if (pending.length === 0) {
        container.innerHTML = '<div class="empty-state">Chill! No pending orders.</div>';
    } else {
        container.innerHTML = pending.map((o, idx) => {
            const items = o.items || [];
            const itemsHtml = items.map(it => `• ${it.name} (${it.selectedSize || 'N/A'}) - TK ${it.price}`).join('<br>');

            return `
                <div class="order-panel-card">
                    <div class="order-panel-meta">
                        <strong>${o.customer.name}</strong>
                        <span>${o.customer.phone}</span>
                        <small style="color:#d4af37;">Order ID: ${o.orderId}</small>
                    </div>
                    <div class="order-panel-items">${itemsHtml}</div>
                    <div class="order-panel-totals">
                        <small>Total: TK ${o.totals.total}</small>
                    </div>
                    <div class="order-panel-actions">
                        <button class="btn-sm success" onclick="archiveOrder('${o.key}')">Approve &amp; Archive</button>
                        <button class="btn-sm danger" onclick="deleteOrder('${o.key}')">Cancel</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.archiveOrder = function (id) {
    if (confirm('Mark as Archived?')) {
        update(dbRef(db, `orders/${id}`), { status: 'Archived' });
    }
};

window.deleteOrder = function (id) {
    if (confirm('Permanently delete this order?')) {
        remove(dbRef(db, `orders/${id}`));
    }
};

// Event binder for pending card
document.getElementById('pendingCard').addEventListener('click', openPendingOrdersPanel);

// Media Manager Slot Logic
const slots = [
    { id: 'homepage_slider', name: 'Main Hero Slider', icon: '🖼️' },
    { id: 'banner', name: 'Middle Banner Area', icon: '🎁' },
    { id: 'deal_of_the_day', name: 'Deal of the Day', icon: '⚡' }
];

function renderMediaGrid() {
    const grid = document.getElementById('mediaManagerGrid');
    grid.innerHTML = slots.map(slot => `
        <div class="media-slot" onclick="selectMediaSlot('${slot.id}', '${slot.name}')">
            <div style="font-size:24px; margin-bottom:10px;">${slot.icon}</div>
            <div style="font-weight:600; font-size:14px;">${slot.name}</div>
            <div id="status_${slot.id}" class="badge muted">Loading...</div>
        </div>
    `).join('');

    // Fetch current status
    slots.forEach(slot => {
        onValue(dbRef(db, `media/${slot.id}`), snap => {
            const val = snap.val();
            const statusEl = document.getElementById(`status_${slot.id}`);
            if (statusEl) {
                statusEl.innerText = val ? 'Active' : 'Empty';
                statusEl.className = val ? 'badge success' : 'badge muted';
            }
        });
    });
}

window.selectMediaSlot = function (id, name) {
    const zone = document.getElementById('mediaUploadZone');
    const title = document.getElementById('currentSlotTitle');
    zone.style.display = 'block';
    title.innerText = `Update: ${name}`;
    zone.setAttribute('data-active-slot', id);
    zone.scrollIntoView({ behavior: 'smooth' });
};

// Handle Upload
document.getElementById('mediaUploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('mediaFile');
    const status = document.getElementById('mediaUploadStatus');
    const slot = document.getElementById('mediaUploadZone').getAttribute('data-active-slot');
    const file = fileInput.files[0];

    if (!file || !slot) return;

    status.innerText = 'Uploading...';
    try {
        const path = `${slot}/${Date.now()}_${file.name}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file);
        const url = await getDownloadURL(ref);
        await update(dbRef(db, `media/${slot}`), { url, updatedAt: Date.now() });
        status.innerHTML = '<span style="color:var(--success)">Live updated!</span>';
    } catch (e) {
        status.innerHTML = '<span style="color:var(--danger)">Failed. Try again.</span>';
    }
});

// Sidebar Navigation Handlers
document.getElementById('navDashboard')?.addEventListener('click', () => location.reload());

document.getElementById('navMessages')?.addEventListener('click', () => {
    alert("Messaging system is coming soon in the next update!");
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => location.href = "index.html");
});

// Init
loadDashboardStats();
renderMediaGrid();
