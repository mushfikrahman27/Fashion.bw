// admin/js/orders-live.js - PHASE 2: Live Order Synchronization & Mobile-First Management
import { db } from '../../firebase-config.js';
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
            
            // Map website data structure to admin display
            const customerName = order.customer?.name || 'Unknown Customer';
            const customerPhone = order.customer?.phone || 'No phone';
            const customerAddress = order.customer?.address || 'No address';
            const orderTotal = order.totals?.total || order.total || 0;
            const itemCount = order.items?.length || 1;
            
            card.innerHTML = `
                <div class="order-id">#${id.slice(-6)}</div>
                <div class="order-price">TK ${orderTotal}</div>
                <div class="customer-info">
                    <strong>${customerName}</strong><br>
                    ${customerPhone}<br>
                    ${customerAddress}<br>
                    <span style="color:var(--gold)">Items: ${itemCount}</span>
                </div>
                <div class="action-group">
                    ${order.status === 'pending' ? `
                        <button class="btn-action btn-approve" onclick="updateStatus('${id}', 'shipped')">Approve</button>
                        <button class="btn-action btn-cancel" onclick="updateStatus('${id}', 'cancelled')">Cancel</button>
                    ` : `<span style="text-transform:uppercase; font-size:0.7rem; letter-spacing:1px; color:#666;">Status: ${order.status}</span>`}
                </div>
            `;
            orderListUI.appendChild(card);
        });
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

window.onload = initOrderManager;
