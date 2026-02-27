// admin/js/dashboard.js
import { auth, db, storage } from '../../firebase-config.js';
import { ref as dbRef, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/** ════════════════════════════════════════════════════
    1. SECURITY & AUTH
    ════════════════════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});

/** ════════════════════════════════════════════════════
    2. GLOBAL STATE & UTILS
    ════════════════════════════════════════════════════ */
let latestOrders = [];
let productSalesMap = {};
let performanceChart = null;

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
        const orders = Object.entries(data).map(([id, o]) => ({ id, ...o }));
        latestOrders = orders;

        // Build sales map for chart
        productSalesMap = {};
        orders.forEach(o => {
            const items = o.isCartOrder ? (o.items || []) : [{ productId: o.productId }];
            items.forEach(it => {
                if (it.productId) {
                    const key = String(it.productId);
                    productSalesMap[key] = (productSalesMap[key] || 0) + 1;
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
            const items = o.isCartOrder ? (o.items || []) : [{ productName: o.productName, price: o.price, productSize: o.productSize }];
            const itemsHtml = items.map(it => `• ${it.productName} (${it.productSize || 'N/A'}) - TK ${it.price}`).join('<br>');

            return `
                <div class="order-panel-card">
                    <div class="order-panel-meta">
                        <strong>${o.customerName}</strong>
                        <span>${o.phone}</span>
                    </div>
                    <div class="order-panel-items">${itemsHtml}</div>
                    <div class="order-panel-actions">
                        <button class="btn-sm success" onclick="archiveOrder('${o.id}')">Approve &amp; Archive</button>
                        <button class="btn-sm danger" onclick="deleteOrder('${o.id}')">Cancel</button>
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
