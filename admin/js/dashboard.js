// admin/js/dashboard.js
import { auth, db } from '../../firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. Security Check: Keu login chara dhukte parbe na
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html"; // Login na thakle login page-e niye jabe
    }
});

// 2. Realtime Stats Load
const totalVisitorsEl = document.getElementById('totalVisitors');
const totalOrdersEl = document.getElementById('totalOrders');
const pendingOrdersEl = document.getElementById('pendingOrders');
const topViewedEl = document.getElementById('topViewedProducts');
const topCartEl = document.getElementById('topCartProducts');

let latestOrders = [];

function loadDashboardStats() {
    // Visitors count
    const visitsRef = ref(db, 'visits');
    onValue(visitsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const totalCount = Object.keys(data).length;
            totalVisitorsEl.innerText = totalCount;
        } else {
            totalVisitorsEl.innerText = "0";
        }
    });

    // Orders & pending orders count (matches 'orders' node used on website)
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const orders = Object.entries(data).map(([id, o]) => ({ id, ...o }));

            latestOrders = orders;

            totalOrdersEl.innerText = orders.length.toString();

            const pendingCount = orders.filter(o => {
                const status = (o.status || '').toString().toLowerCase();
                return status === 'pending';
            }).length;
            pendingOrdersEl.innerText = pendingCount.toString();
        } else {
            latestOrders = [];
            totalOrdersEl.innerText = "0";
            pendingOrdersEl.innerText = "0";
        }
    }, (error) => {
        console.error("Orders read error:", error);
        totalOrdersEl.innerText = "—";
        pendingOrdersEl.innerText = "—";
    });

    // Product analytics (top 7)
    const analyticsRef = ref(db, 'product_analytics');
    onValue(analyticsRef, (snapshot) => {
        if (!topViewedEl || !topCartEl) return;

        if (!snapshot.exists()) {
            topViewedEl.innerHTML = "<li>No data yet</li>";
            topCartEl.innerHTML = "<li>No data yet</li>";
            return;
        }

        const data = snapshot.val();
        const list = Object.values(data);

        const topViewed = [...list]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 7);

        const topCart = [...list]
            .sort((a, b) => (b.carts || 0) - (a.carts || 0))
            .slice(0, 7);

        topViewedEl.innerHTML = topViewed.map(p => {
            const name = p.productName || `Product #${p.productId || ''}`;
            const views = p.views || 0;
            return `<li>${name} — ${views}</li>`;
        }).join('') || "<li>No data yet</li>";

        topCartEl.innerHTML = topCart.map(p => {
            const name = p.productName || `Product #${p.productId || ''}`;
            const carts = p.carts || 0;
            return `<li>${name} — ${carts}</li>`;
        }).join('') || "<li>No data yet</li>";
    }, (error) => {
        console.error("Analytics read error:", error);
        if (topViewedEl) topViewedEl.innerHTML = "<li>—</li>";
        if (topCartEl) topCartEl.innerHTML = "<li>—</li>";
    });
}

function openPendingOrdersModal() {
    const pending = latestOrders.filter(o => (o.status || '').toString().toLowerCase() === 'pending');

    const overlay = document.createElement('div');
    overlay.id = 'pendingOrdersOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const card = document.createElement('div');
    card.style.background = '#ffffff';
    card.style.borderRadius = '10px';
    card.style.maxWidth = '720px';
    card.style.width = '90%';
    card.style.maxHeight = '80vh';
    card.style.overflowY = 'auto';
    card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    card.style.padding = '20px 24px';
    card.style.boxSizing = 'border-box';
    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h2 style="margin:0; font-size:18px; color:#2c3e50;">Pending Orders (${pending.length})</h2>
            <button id="closePendingOverlayBtn" style="border:none; background:none; font-size:20px; cursor:pointer;">&times;</button>
        </div>
        <div style="border-top:1px solid #ecf0f1; margin-top:8px; padding-top:12px;">
            ${
                pending.length === 0
                    ? '<p style="margin:0; color:#7f8c8d;">No pending orders.</p>'
                    : pending.map((o, idx) => {
                        const isCart = o.isCartOrder && Array.isArray(o.items);
                        let productsHtml;

                        if (isCart && o.items && o.items.length) {
                            productsHtml = o.items.map(it => {
                                const size = it.productSize || 'N/A';
                                const color = it.color || 'N/A';
                                return `- ${it.productName || ''} (Size: ${size}, Color: ${color}) — TK ${it.price || ''}`;
                            }).join('<br>');
                        } else {
                            const size = o.productSize || 'N/A';
                            productsHtml = `- ${o.productName || ''} (Size: ${size}) — TK ${o.price || ''}`;
                        }

                        return `
                            <div style="padding:10px 0; border-bottom:1px solid #f0f0f0;">
                                <div style="font-weight:600; color:#2c3e50; margin-bottom:4px;">#${idx + 1} ${o.customerName || ''}</div>
                                <div style="font-size:12px; color:#7f8c8d; margin-bottom:6px;">
                                    Phone: ${o.phone || ''} &nbsp;•&nbsp; Address: ${o.address || ''}
                                </div>
                                <div style="font-size:13px; color:#34495e;">
                                    ${productsHtml}
                                </div>
                                <div style="font-size:11px; color:#95a5a6; margin-top:4px; text-transform:uppercase;">
                                    Status: ${o.status || 'Pending'}
                                </div>
                            </div>
                        `;
                    }).join('')
            }
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('closePendingOverlayBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// 3. Logout System & interactions
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("Logged Out!");
            window.location.href = "index.html";
        });
    });
}

const pendingCard = document.getElementById('pendingCard');
if (pendingCard) {
    pendingCard.style.cursor = 'pointer';
    pendingCard.addEventListener('click', () => {
        openPendingOrdersModal();
    });
}

// Execute function
loadDashboardStats();