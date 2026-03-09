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

    // C. PRODUCTS DATA (for chart)
    const productsRef = dbRef(db, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const products = Object.values(data);
        renderPerformanceChart(products);
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

function renderPerformanceChart(products) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    const labels = products.slice(0, 5).map(p => p.name);
    const data = labels.map(label => productSalesMap[label] || 0);

    if (performanceChart) performanceChart.destroy();
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Sales',
                data,
                backgroundColor: '#4f46e5',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
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
    { id: 'slot1', label: 'Hero Banner' },
    { id: 'slot2', label: 'Featured 1' },
    { id: 'slot3', label: 'Featured 2' },
    { id: 'slot4', label: 'Featured 3' },
    { id: 'slot5', label: 'Mobile Banner' }
];

function renderMediaManager() {
    const container = document.getElementById('mediaSlots');
    if (!container) return;
    container.innerHTML = slots.map(slot => `
        <div class="media-slot" data-slot="${slot.id}">
            <h4>${slot.label}</h4>
            <div class="slot-preview" id="${slot.id}Preview"></div>
            <input type="file" id="${slot.id}File" accept="image/*" style="display:none;">
            <button class="btn-sm" onclick="document.getElementById('${slot.id}File').click()">Choose Image</button>
            <button class="btn-sm primary" onclick="uploadToSlot('${slot.id}')" style="display:none;" id="${slot.id}Upload">Upload</button>
        </div>
    `).join('');

    // Load existing media
    slots.forEach(slot => {
        const mediaRef = dbRef(db, `media/${slot.id}`);
        onValue(mediaRef, (snap) => {
            const data = snap.val();
            const preview = document.getElementById(`${slot.id}Preview`);
            if (data && data.url) {
                preview.innerHTML = `<img src="${data.url}" alt="${slot.label}">`;
            } else {
                preview.innerHTML = '<div class="no-media">No media</div>';
            }
        });

        // File input listener
        const fileInput = document.getElementById(`${slot.id}File`);
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                document.getElementById(`${slot.id}Upload`).style.display = 'inline-block';
            }
        });
    });
}

async function uploadToSlot(slotId) {
    const file = document.getElementById(`${slotId}File`).files[0];
    if (!file) return;

    const storagePath = `media/${slotId}/${Date.now()}-${file.name}`;
    const storageRefPath = storageRef(storage, storagePath);

    try {
        await uploadBytes(storageRefPath, file);
        const url = await getDownloadURL(storageRefPath);
        await update(dbRef(db, `media/${slotId}`), { url, updatedAt: Date.now() });
        alert('Uploaded successfully!');
        document.getElementById(`${slotId}Upload`).style.display = 'none';
        document.getElementById(`${slotId}File`).value = '';
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed. Try again.');
    }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

// INIT
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    renderMediaManager();
});
