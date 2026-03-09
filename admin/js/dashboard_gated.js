// admin/js/dashboard.js
import { auth, db, storage } from '../../firebase-config.js';
import { ref as dbRef, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/** ════════════════════════════════════════════════════
    1. SECURITY & AUTH + ADMIN ROLE GATING
    ════════════════════════════════════════════════════ */
let isAdmin = false;
let currentUserId = null;

// Admin role check function
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

// Admin requirement helper
async function requireAdminOrBlock(actionName) {
    if (!isAdmin) {
        alert('Not authorized: Admin access required for ' + actionName);
        return false;
    }
    return true;
}

// Enhanced auth state change with role checking
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    
    currentUserId = user.uid;
    
    // Check admin role
    isAdmin = await checkAdminRole(user.uid);
    
    if (!isAdmin) {
        // Disable all admin controls
        disableAdminControls();
        showUnauthorizedMessage();
    } else {
        // Enable controls for admin
        enableAdminControls();
    }
    
    // Load dashboard data regardless (read access allowed)
    loadDashboardStats();
    renderMediaGrid();
});

function disableAdminControls() {
    // Disable order action buttons
    const orderButtons = document.querySelectorAll('.btn-sm');
    orderButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.title = 'Admin access required';
    });
    
    // Disable media upload
    const mediaUploadBtn = document.getElementById('mediaUploadBtn');
    if (mediaUploadBtn) {
        mediaUploadBtn.disabled = true;
        mediaUploadBtn.style.opacity = '0.5';
        mediaUploadBtn.title = 'Admin access required';
    }
    
    // Disable any other admin controls
    const adminControls = document.querySelectorAll('[data-admin-only]');
    adminControls.forEach(control => {
        control.disabled = true;
        control.style.opacity = '0.5';
        control.title = 'Admin access required';
    });
}

function enableAdminControls() {
    // Enable all admin controls
    const disabledControls = document.querySelectorAll('.btn-sm[disabled], #mediaUploadBtn[disabled], [data-admin-only][disabled]');
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
        background: #ff4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(255,68,68,0.3);
    `;
    message.textContent = 'Limited access: You are viewing as a non-admin user';
    container.appendChild(message);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 5000);
}

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
    2.1 ORDER SCHEMA NORMALIZATION
    ════════════════════════════════════════════════════ */
// Normalize new order schema to what admin UI expects
function normalizeOrder(order) {
    // Check if it's the new schema (has orderId, customer, items, totals)
    if (order.orderId && order.customer && order.items && order.totals) {
        // New schema - convert to old format for UI compatibility
        return {
            id: order.id, // Firebase key
            orderId: order.orderId,
            customerName: order.customer.name,
            phone: order.customer.phone,
            address: order.customer.address,
            status: order.status,
            createdAt: order.createdAt,
            channel: order.channel,
            // Backward compatibility fields
            productName: order.items.length === 1 ? order.items[0].name : `Cart Order (${order.items.length} items)`,
            productId: order.items.length === 1 ? order.items[0].productId : 'cart',
            productSize: order.items.length === 1 ? (order.items[0].selectedSize || 'N/A') : 'N/A',
            price: order.totals.total,
            totalPrice: order.totals.total,
            isCartOrder: order.items.length > 1,
            items: order.items.map(it => ({
                productId: it.productId,
                productName: it.name,
                productSize: it.selectedSize || 'N/A',
                price: it.price,
                qty: it.qty || 1,
                color: it.color || ''
            }))
        };
    } else {
        // Old schema - return as-is with defaults
        return {
            ...order,
            orderId: order.orderId || 'N/A',
            channel: order.channel || 'direct',
            isCartOrder: order.isCartOrder || false,
            items: order.items || []
        };
    }
}

/** ════════════════════════════════════════════════════
    3. DATA LISTENERS (Firebase Core)
    ════════════════════════════════════════════════════ */
function loadDashboardStats() {
    // A. VISITORS DATA
    const visitsRef = dbRef(db, 'visits');
    onValue(visitsRef, (snapshot) => {
        const val = snapshot.val() || {};
        calculateVisitorTrend(visits);
    });

    // B. ORDERS DATA
    const ordersRef = dbRef(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const rawOrders = Object.entries(data).map(([id, o]) => ({ id, ...o }));
        
        // Normalize all orders to compatible format
        const orders = rawOrders.map(order => normalizeOrder(order));
        latestOrders = orders;

        // Build sales map for chart
        productSalesMap = {};
        orders.forEach(o => {
            const items = o.isCartOrder ? (o.items || []) : [{ productId: o.productId }];
            items.forEach(it => {
                if (it.productId) {
                    productSalesMap[it.productId] = (productSalesMap[it.productId] || 0) + 1;
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
    4. CHARTS & METRICS
    ════════════════════════════════════════════════════ */
function calculateVisitorTrend(visits) {
    const trendEl = document.getElementById('visitorTrend');
    if (!trendEl) return;
    const days = Object.keys(visits).sort().slice(-7);
    const counts = days.map(d => visits[d] || 0);
    const trend = counts[counts.length - 1] - counts[0];
    trendEl.innerText = trend >= 0 ? `+${trend}` : `${trend}`;
    trendEl.className = trend >= 0 ? 'trend-up' : 'trend-down';
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
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Views',
                    data: views,
                    backgroundColor: '#4f46e5',
                    borderRadius: 6
                },
                {
                    label: 'Sales',
                    data: conversions,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function updatePriorityAlerts(list) {
    const atRisk = list.filter(p => (p.views || 0) > 20 && (productSalesMap[String(p.productId)] || 0) === 0);
    const container = document.getElementById('atRiskProducts');
    document.getElementById('alertCount').innerText = atRisk.length;

    if (atRisk.length === 0) {
        container.innerHTML = '<div class="empty-state">No high-risk products detected.</div>';
    } else {
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
            // Use normalized items array
            const items = o.isCartOrder ? (o.items || []) : [{ productName: o.productName, price: o.price, productSize: o.productSize }];
            const itemsHtml = items.map(it => `• ${it.productName} (${it.productSize || 'N/A'}) - TK ${it.price}`).join('<br>');

            // Show orderId if available
            const orderIdDisplay = o.orderId && o.orderId !== 'N/A' ? `<small style="color:#888;">ID: ${o.orderId}</small>` : '';

            return `
                <div class="order-panel-card">
                    <div class="order-panel-meta">
                        <strong>${o.customerName}</strong>
                        <span>${o.phone}</span>
                        ${orderIdDisplay}
                    </div>
                    <div class="order-panel-items">${itemsHtml}</div>
                    <div class="order-panel-actions">
                        <button class="btn-sm success" onclick="archiveOrder('${o.id}')" ${!isAdmin ? 'disabled' : ''}>Approve &amp; Archive</button>
                        <button class="btn-sm danger" onclick="deleteOrder('${o.id}')" ${!isAdmin ? 'disabled' : ''}>Cancel</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// GATED ORDER OPERATIONS
window.archiveOrder = async function (id) {
    if (!(await requireAdminOrBlock('order archiving'))) return;
    
    if (confirm('Mark as Archived?')) {
        try {
            await update(dbRef(db, `orders/${id}`), { status: 'Archived' });
        } catch (error) {
            console.error('Failed to archive order:', error);
            alert('Failed to archive order. Please try again.');
        }
    }
};

window.deleteOrder = async function (id) {
    if (!(await requireAdminOrBlock('order deletion'))) return;
    
    if (confirm('Permanently delete this order?')) {
        try {
            await remove(dbRef(db, `orders/${id}`));
        } catch (error) {
            console.error('Failed to delete order:', error);
            alert('Failed to delete order. Please try again.');
        }
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
                statusEl.className = val?.url ? 'badge success' : 'badge muted';
                statusEl.innerText = val?.url ? 'Live' : 'Empty';
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

// GATED MEDIA UPLOAD
document.getElementById('mediaUploadBtn').addEventListener('click', async () => {
    if (!(await requireAdminOrBlock('media upload'))) return;
    
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

document.getElementById('navDashboard')?.addEventListener('click', () => location.reload());

document.getElementById('navMessages')?.addEventListener('click', () => {
    alert("Messaging system is coming soon in the next update!");
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

// Note: loadDashboardStats() and renderMediaGrid() are called in the auth state change handler
