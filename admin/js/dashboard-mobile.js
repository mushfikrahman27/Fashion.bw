// admin/js/dashboard.js - STABLE MODULAR ENGINE
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBYvTkVaW2ARhR6Ce5TUJJeyak9ojdWf4",
    authDomain: "my-1st-site-09.firebaseapp.com",
    projectId: "my-1st-site-09",
    storageBucket: "my-1st-site-09.firebasestorage.app",
    messagingSenderId: "716729465081",
    appId: "1:716729465081:web:bef18625e664ac13ba4a28"
};

// Use existing app or initialize default (prevents auth session isolation)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);
function startInarahLive() {
    // 1. Sync Visitors
    onValue(ref(db, 'visits'), (snap) => {
        const visitorCount = snap.exists() ? Object.keys(snap.val()).length : 0;
        const uiVisitors = document.getElementById('stat-visitors');
        if(uiVisitors) uiVisitors.innerText = visitorCount;
    }, (error) => console.error("Visitors read error:", error));

    // 2. Sync Orders & Revenue & Render Cards
    const orderListUI = document.getElementById('live-order-list');

    onValue(ref(db, 'orders'), (snap) => {
        console.log("Dashboard Order Summary:", snap.val()); // Debug logging
        
        let rev = 0;
        let active = 0;
        
        if (!snap.exists()) {
            if(orderListUI) orderListUI.innerHTML = "<p style='text-align:center;'>No orders found.</p>";
            const uiRev = document.getElementById('stat-revenue');
            if(uiRev) uiRev.innerText = `TK 0`;
            const uiOrders = document.getElementById('stat-orders');
            if(uiOrders) uiOrders.innerText = 0;
            return;
        }

        const data = snap.val();
        
        // Loop for stats
        Object.values(data).forEach(o => {
            const orderTotal = o.totalPrice || o.price || o.totals?.total || o.total || 0;
            if (o.status === 'pending') { active++; }
            if (o.status === 'completed' || o.status === 'shipped') { rev += Number(orderTotal); }
        });
        
        const uiRev = document.getElementById('stat-revenue');
        if(uiRev) uiRev.innerText = `TK ${rev}`;
        const uiOrders = document.getElementById('stat-orders');
        if(uiOrders) uiOrders.innerText = active;

        // Render Cards if container exists
        if(orderListUI) {
            orderListUI.innerHTML = ""; // Clear loader
            const sortedOrders = Object.entries(data).reverse();

            sortedOrders.forEach(([id, order]) => {
                const card = document.createElement('div');
                card.className = `order-card status-${order.status || 'pending'}`;
                card.id = id;

                const customerName = order.customerName || order.name || order.customer?.name || 'N/A';
                const customerPhone = order.phone || order.contact || order.customer?.phone || 'No Number';
                const customerAddress = order.address || order.location || order.customer?.address || 'No Address';
                const orderTotal = order.totalPrice || order.price || order.totals?.total || order.total || 0;
                const items = order.items || order.products || [];
                const itemCount = items.length || 0;

                let itemsHtml = '<div style="margin-top:10px; padding-top:10px; border-top:1px solid #ddd;">';
                if (itemCount > 0) {
                    itemsHtml += `<div style="font-weight:bold; margin-bottom:5px; color:var(--gold)">Order Items (${itemCount}):</div>`;
                    items.forEach(itm => {
                        const itemName = itm.name || itm.title || itm.productId || 'Unknown Item';
                        const itemQty = itm.qty || itm.quantity || 1;
                        const itemSize = itm.size || itm.selectedSize ? ` <span style="color:#666; font-size:0.8rem;">(Size: ${itm.size || itm.selectedSize})</span>` : '';
                        const itemPrice = itm.price ? ` - TK ${itm.price}` : '';
                        itemsHtml += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px dashed #eee;">
                            • ${itemName} <strong>x${itemQty}</strong>${itemSize}${itemPrice}
                        </div>`;
                    });
                } else {
                    itemsHtml += `<span style="color:var(--gold)">No items detailed.</span>`;
                }
                itemsHtml += '</div>';

                card.innerHTML = `
                    <div class="order-id" style="font-weight:bold; margin-bottom:8px; display:inline-block; background:#f4f4f4; padding:2px 8px; border-radius:4px;">#${id.slice(-6)}</div>
                    <div class="order-price" style="font-size:1.1rem; font-weight:bold; float:right; color:var(--gold);">TK ${orderTotal}</div>
                    <div class="customer-info" style="line-height:1.5; font-size:0.95rem;">
                        <div style="font-size:1.1rem; color:#000; margin-bottom:4px;"><strong>${customerName}</strong></div>
                        <div style="margin-bottom:2px;">📞 ${customerPhone}</div>
                        <div style="margin-bottom:8px;">📍 ${customerAddress}</div>
                        ${itemsHtml}
                    </div>
                    <div class="action-group" style="margin-top:10px; border-top:1px solid #ddd; padding-top:10px;">
                        ${order.status === 'pending' ? `
                            <button class="btn-action btn-approve" onclick="updateStatus('${id}', 'shipped')" style="background:#4CAF50; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer; margin-right:5px;">Approve</button>
                            <button class="btn-action btn-cancel" onclick="updateStatus('${id}', 'cancelled')" style="background:#f44336; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer;">Cancel</button>
                        ` : `<span style="text-transform:uppercase; font-size:0.7rem; letter-spacing:1px; color:#666; font-weight:bold;">Status: ${order.status}</span>`}
                    </div>
                `;
                orderListUI.appendChild(card);
            });
        }
    }, (error) => {
        console.error("Orders read error on summary:", error);
        if(orderListUI && error.code === 'PERMISSION_DENIED') {
            orderListUI.innerHTML = `
                <div style="background:#ffebee; border:2px solid #ef5350; padding:20px; border-radius:8px; text-align:center;">
                    <h3 style="color:#c62828;">⚠️ FIREBASE SECURITY BLOCK</h3>
                    <p style="color:#000;">Please set your database rules to <b>.read: true</b> to view orders instantly.</p>
                </div>
            `;
        }
    });
}

// Global function to update status directly from Dashboard
window.updateStatus = (orderId, newStatus) => {
    const orderRef = ref(db, `orders/${orderId}`);
    update(orderRef, { status: newStatus })
        .then(() => {
            alert(`Order ${newStatus} successfully!`);
        })
        .catch(err => console.error('Status update failed:', err));
};

// Initialize immediately (module scripts run after DOM is parsed anyway)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Admin Logged In:", user.email);
        startInarahLive();
    } else {
        console.warn("Unauthorized Access Attempt - Redirecting to Login...");
        window.location.href = "index.html"; 
    }
});
