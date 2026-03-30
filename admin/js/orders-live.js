// admin/js/orders-live.js - STABLE MODULAR ENGINE
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);

const orderListUI = document.getElementById('live-order-list');
const orderCountBadge = document.getElementById('order-count-badge');
const alertSound = new Audio('../assets/sounds/notification.mp3'); // Put a small mp3 here

let previousOrderCount = 0;

function initOrderManager() {
    const ordersRef = ref(db, 'orders');

    onValue(ordersRef, (snapshot) => {
        console.log("Raw Order Data:", snapshot.val()); // Debug logging

        if (!snapshot.exists()) {
            orderListUI.innerHTML = "<p style='text-align:center;'>No orders found.</p>";
            orderCountBadge.textContent = '0';
            return;
        }

        const data = snapshot.val();
        const currentOrderCount = Object.keys(data).length;

        // Play sound for new orders (only if count increases)
        if (currentOrderCount > previousOrderCount && alertSound) {
            alertSound.play().catch(e => console.log('Sound play failed:', e));
        }

        previousOrderCount = currentOrderCount;
        orderCountBadge.textContent = currentOrderCount;

        orderListUI.innerHTML = ""; // Clear loader

        // Convert object to array and sort by newest first
        const sortedOrders = Object.entries(data).reverse();

        sortedOrders.forEach(([id, order]) => {
            const card = document.createElement('div');
            card.className = `order-card status-${order.status || 'pending'}`;
            card.id = id;

            // Map website data structure to admin display dynamically
            const customerName = order.customerName || order.name || order.customer?.name || 'N/A';
            const customerPhone = order.phone || order.contact || order.customer?.phone || 'No Number';
            const customerAddress = order.address || order.location || order.customer?.address || 'No Address';
            const orderTotal = order.totalPrice || order.price || order.totals?.total || order.total || 0;
            const items = order.items || order.products || [];
            const itemCount = items.length || 0;

            // Build detailed items HTML to satisfy user's request for full product details
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
                <div class="action-group">
                    ${order.status === 'pending' ? `
                        <button class="btn-action btn-approve" onclick="updateStatus('${id}', 'shipped')">Approve</button>
                        <button class="btn-action btn-cancel" onclick="updateStatus('${id}', 'cancelled')">Cancel</button>
                    ` : `<span style="text-transform:uppercase; font-size:0.7rem; letter-spacing:1px; color:#666; font-weight:bold;">Status: ${order.status}</span>`}
                </div>
            `;
            orderListUI.appendChild(card);
        });
    }, (error) => {
        console.error("FIREBASE READ BLOCKED:", error);
        if (error.code === 'PERMISSION_DENIED') {
            orderListUI.innerHTML = `
                <div style="background:#ffebee; border:2px solid #ef5350; padding:20px; border-radius:8px; text-align:center; max-width:500px; margin:0 auto;">
                    <h3 style="color:#c62828;">⚠️ FIREBASE SECURITY BLOCK</h3>
                    <p style="color:#000;">Firebase is blocking this page from reading the orders!</p>
                    <p style="color:#000; font-size:14px; margin-top:10px;">To fix instantly, change your Firebase Database Rules to:</p>
                    <pre style="background:#fff; padding:10px; border:1px solid #ccc; font-weight:bold; text-align:left; overflow:auto;">
"orders": {
  ".read": true,
  ".write": true
}</pre>
                </div>
            `;
        } else {
            orderListUI.innerHTML = `<p style='text-align:center; color:red;'>Error Loading Orders: ${error.message}</p>`;
        }
    });
}

// Global function to update status
window.updateStatus = (orderId, newStatus) => {
    const orderRef = ref(db, `orders/${orderId}`);
    update(orderRef, { status: newStatus })
        .then(() => {
            // Show success feedback
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--gold);
                color: #000;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
            `;
            feedback.textContent = `Order ${newStatus} successfully!`;
            document.body.appendChild(feedback);

            setTimeout(() => feedback.remove(), 3000);
        })
        .catch(err => console.error('Status update failed:', err));
};

// Initialize immediately (module scripts run after DOM is parsed anyway)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Admin Session Confirmed, fetching orders...");
        initOrderManager();
    } else {
        console.warn("Unauthorized Access Attempt - Redirecting to Login...");
        window.location.href = "index.html"; 
    }
});
