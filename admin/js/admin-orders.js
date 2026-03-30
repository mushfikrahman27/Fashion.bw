// ============================================
// COMPLETE ORDER MANAGEMENT SYSTEM
// admin-orders.js
// ============================================

import { 
    COLLECTIONS, 
    SUBCOLLECTIONS, 
    ORDER_STATUS, 
    ORDER_STATUS_FLOW, 
    isValidStatusTransition,
    getCollectionRef,
    getDocRef 
} from './firebase-paths.js';
import { registerFirestoreListener } from './utils/cleanup-manager.js';
import { logOrderAction } from './utils/audit-log.js';

class OrderManagementSystem {
    constructor() {
        this.orders = {};
        this.filteredOrders = [];
        this.currentFilter = 'all';
        this.selectedOrders = new Set();
        this.unsubscribe = null;
    }

    // ─────────────────────────────────────────
    // INIT & REAL-TIME LISTENER
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) {
            console.warn('Firebase not ready for orders');
            return;
        }
        
        const ordersRef = getCollectionRef('ORDERS');
        this.unsubscribe = ordersRef.onSnapshot((snapshot) => {
            this.orders = {};
            snapshot.forEach(doc => {
                this.orders[doc.id] = { ...doc.data(), _id: doc.id };
            });
            this.renderOrders();
            this.renderOrderStats();
        });
        
        // Register for cleanup
        registerFirestoreListener('orders', this.unsubscribe);
    }

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
    }

    // ─────────────────────────────────────────
    // STATUS CONFIG
    // ─────────────────────────────────────────
    getStatusConfig() {
        return {
            pending:    { label: 'Pending',    color: '#f59e0b', bg: '#fef3c7', icon: '🕐', next: 'processing' },
            processing: { label: 'Processing', color: '#3b82f6', bg: '#dbeafe', icon: '⚙️', next: 'shipped' },
            shipped:    { label: 'Shipped',     color: '#8b5cf6', bg: '#ede9fe', icon: '🚚', next: 'delivered' },
            delivered:  { label: 'Delivered',   color: '#10b981', bg: '#d1fae5', icon: '✅', next: null },
            cancelled:  { label: 'Cancelled',   color: '#ef4444', bg: '#fee2e2', icon: '❌', next: null }
        };
    }

    statusBadge(status) {
        const cfg = this.getStatusConfig()[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };
        return `<span style="background:${cfg.bg};color:${cfg.color};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${cfg.icon} ${cfg.label}</span>`;
    }

    // ─────────────────────────────────────────
    // STATS BAR
    // ─────────────────────────────────────────
    renderOrderStats() {
        const el = document.getElementById('orderStatsBar');
        if (!el) return;
        const all = Object.values(this.orders);
        const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
        let totalRevenue = 0;
        all.forEach(o => {
            if (counts[o.status] !== undefined) counts[o.status]++;
            if (o.status === 'delivered') totalRevenue += (o.totalAmount || o.total || 0);
        });
        el.innerHTML = `
            <div class="ostat-card" onclick="orderSystem.setFilter('all')">
                <div class="ostat-val">${all.length}</div>
                <div class="ostat-lbl">All Orders</div>
            </div>
            <div class="ostat-card pending" onclick="orderSystem.setFilter('pending')">
                <div class="ostat-val">${counts.pending}</div>
                <div class="ostat-lbl">🕐 Pending</div>
            </div>
            <div class="ostat-card processing" onclick="orderSystem.setFilter('processing')">
                <div class="ostat-val">${counts.processing}</div>
                <div class="ostat-lbl">⚙️ Processing</div>
            </div>
            <div class="ostat-card shipped" onclick="orderSystem.setFilter('shipped')">
                <div class="ostat-val">${counts.shipped}</div>
                <div class="ostat-lbl">🚚 Shipped</div>
            </div>
            <div class="ostat-card delivered" onclick="orderSystem.setFilter('delivered')">
                <div class="ostat-val">${counts.delivered}</div>
                <div class="ostat-lbl">✅ Delivered</div>
            </div>
            <div class="ostat-card revenue">
                <div class="ostat-val">TK ${totalRevenue.toLocaleString()}</div>
                <div class="ostat-lbl">💰 Revenue</div>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // FILTER & SEARCH
    // ─────────────────────────────────────────
    setFilter(status) {
        this.currentFilter = status;
        this.renderOrders();
    }

    getFilteredOrders(searchTerm = '') {
        let list = Object.entries(this.orders).map(([id, o]) => ({ ...o, _id: id }));
        if (this.currentFilter !== 'all') {
            list = list.filter(o => o.status === this.currentFilter);
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(o =>
                (o._id || '').toLowerCase().includes(q) ||
                (o.customerName || o.customer || '').toLowerCase().includes(q) ||
                (o.customerPhone || o.phone || '').toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
    }

    // ─────────────────────────────────────────
    // RENDER ORDER TABLE
    // ─────────────────────────────────────────
    renderOrders() {
        const el = document.getElementById('ordersTableBody');
        if (!el) return;
        const search = document.getElementById('orderSearchInput')?.value || '';
        const list = this.getFilteredOrders(search);
        this.filteredOrders = list;

        if (list.length === 0) {
            el.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;">No orders found</td></tr>`;
            return;
        }

        el.innerHTML = list.map(order => {
            const cfg = this.getStatusConfig()[order.status] || {};
            const next = cfg.next;
            const date = order.timestamp || order.createdAt
                ? new Date(order.timestamp || order.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                : '—';
            const amount = (order.totalAmount || order.total || 0).toLocaleString();
            const customer = order.customerName || order.customer || 'Unknown';
            const phone = order.customerPhone || order.phone || '—';
            const items = Array.isArray(order.items) ? order.items.length : '—';

            return `
            <tr class="order-row" id="row-${order._id}">
                <td><input type="checkbox" class="order-checkbox" value="${order._id}" onchange="orderSystem.toggleSelect('${order._id}')"></td>
                <td><strong>#${order._id.slice(-6).toUpperCase()}</strong><br><small style="color:#9ca3af">${date}</small></td>
                <td><strong>${customer}</strong><br><small style="color:#9ca3af">${phone}</small></td>
                <td>${items} item${items !== 1 ? 's' : ''}</td>
                <td><strong>TK ${amount}</strong></td>
                <td>${this.statusBadge(order.status || 'pending')}</td>
                <td>
                    ${next ? `<button class="obtn obtn-primary" onclick="orderSystem.updateStatus('${order._id}', '${next}')">→ ${this.getStatusConfig()[next].label}</button>` : ''}
                    <button class="obtn obtn-cancel" onclick="orderSystem.cancelOrder('${order._id}')">Cancel</button>
                </td>
                <td><button class="obtn obtn-view" onclick="orderSystem.viewOrder('${order._id}')">👁️ View</button></td>
            </tr>`;
        }).join('');
    }

    // ─────────────────────────────────────────
    // ORDER VALIDATION
    // ─────────────────────────────────────────
    validateOrder(orderData) {
        const errors = [];
        
        // Customer validation
        if (!orderData.customerName || orderData.customerName.trim() === '') {
            errors.push('Customer name is required');
        }
        
        if (!orderData.customerId || orderData.customerId.trim() === '') {
            errors.push('Customer ID is required');
        }
        
        // Total validation
        if (!orderData.total || typeof orderData.total !== 'number' || orderData.total <= 0) {
            errors.push('Order total must be a positive number');
        }
        
        // Items validation
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            errors.push('At least one product item is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ─────────────────────────────────────────
    // UPDATE ORDER STATUS WITH TRANSACTION
    // ─────────────────────────────────────────
    async updateStatus(orderId, newStatus) {
        if (!window.firebaseDB) return;
        
        const orderRef = getDocRef('ORDERS', orderId);
        
        try {
            await window.firebaseDB.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                
                if (!orderDoc.exists) {
                    throw new Error('Order not found');
                }
                
                const currentOrder = orderDoc.data();
                const currentStatus = currentOrder.status;
                
                // Prevent invalid status transitions
                const validTransitions = {
                    "pending": ["processing", "cancelled"],
                    "processing": ["shipped", "cancelled"],
                    "shipped": ["delivered"],
                    "delivered": [],
                    "cancelled": []
                };
                
                if (!validTransitions[currentStatus]?.includes(newStatus)) {
                    throw new Error(`Cannot change status from ${currentStatus} to ${newStatus}`);
                }
                
                // Update with optimistic locking
                transaction.update(orderRef, {
                    status: newStatus,
                    lastModifiedBy: window.firebaseAuth.currentUser?.uid,
                    updatedAt: Date.now()
                });
                
                return {
                    previousStatus: currentStatus,
                    newStatus: newStatus,
                    updatedBy: window.firebaseAuth.currentUser?.uid
                };
            });
            
            // Log the status change
            await logOrderAction('STATUS_CHANGED', {
                orderId: orderId,
                previousStatus: currentStatus,
                newStatus: newStatus,
                updatedBy: window.firebaseAuth.currentUser?.uid
            });
            
            showToast(`Order status updated to ${newStatus}`, 'success');
            
        } catch (error) {
            console.error('Status update error:', error);
            showToast('Failed to update order status: ' + error.message, 'error');
        }
    }

    // ─────────────────────────────────────────
    // ADD STATUS HISTORY
    // ─────────────────────────────────────────
    async addStatusHistory(orderId, status) {
        const historyRef = getDocRef('ORDERS', orderId).collection(SUBCOLLECTIONS.STATUS_HISTORY);
        await historyRef.add({
            status: status,
            timestamp: Date.now(),
            updatedBy: window.firebaseAuth?.currentUser?.uid || 'unknown'
        });
    }

    async cancelOrder(orderId) {
        if (!confirm('Cancel this order? Stock will be restored.')) return;
        const order = this.orders[orderId];
        if (!order) return;

        // Restore stock if was processing
        if (order.status === 'processing' || order.status === 'shipped') {
            await this.restoreInventory(orderId);
        }

        await this.updateStatus(orderId, 'cancelled');
    }

    // ─────────────────────────────────────────
    // BULK OPERATIONS
    // ─────────────────────────────────────────
    toggleSelect(orderId) {
        if (this.selectedOrders.has(orderId)) {
            this.selectedOrders.delete(orderId);
        } else {
            this.selectedOrders.add(orderId);
        }
        this.updateBulkBar();
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('.order-checkbox');
        const allChecked = this.selectedOrders.size === checkboxes.length;
        checkboxes.forEach(cb => {
            if (allChecked) {
                this.selectedOrders.delete(cb.value);
                cb.checked = false;
            } else {
                this.selectedOrders.add(cb.value);
                cb.checked = true;
            }
        });
        this.updateBulkBar();
    }

    updateBulkBar() {
        const bar = document.getElementById('bulkActionBar');
        const countEl = document.getElementById('bulkSelectedCount');
        if (!bar) return;
        if (this.selectedOrders.size > 0) {
            bar.style.display = 'flex';
            if (countEl) countEl.textContent = this.selectedOrders.size;
        } else {
            bar.style.display = 'none';
        }
    }

    async bulkUpdateStatus(newStatus) {
        if (this.selectedOrders.size === 0) return;
        if (!confirm(`Update ${this.selectedOrders.size} orders to "${newStatus}"?`)) return;
        const promises = [...this.selectedOrders].map(id => this.updateStatus(id, newStatus));
        await Promise.all(promises);
        this.selectedOrders.clear();
        this.updateBulkBar();
        document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = false);
        this.showToast(`${promises.length} orders updated`, 'success');
    }

    // ─────────────────────────────────────────
    // INVENTORY DEDUCTION
    // ─────────────────────────────────────────
    async deductInventory(orderId) {
        const order = this.orders[orderId];
        if (!order || !Array.isArray(order.items)) return;
        if (!window.firebaseDB) return;
        const { ref, get, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        for (const item of order.items) {
            const productId = item.productId || item.id;
            const qty = item.quantity || 1;
            if (!productId) continue;

            try {
                // Try products-catalog path (adjust to match your Firebase structure)
                const snap = await get(ref(window.firebaseDB, `products/${productId}`));
                if (snap.exists()) {
                    const product = snap.val();
                    const currentStock = product.stock || product.quantity || 0;
                    const newStock = Math.max(0, currentStock - qty);
                    await update(ref(window.firebaseDB, `products/${productId}`), {
                        stock: newStock,
                        lastStockUpdate: Date.now()
                    });
                    // Low stock alert
                    if (newStock <= (product.lowStockThreshold || 5)) {
                        this.showLowStockAlert(product.name || productId, newStock);
                        await this.saveLowStockAlert(productId, product.name || productId, newStock);
                    }
                }
            } catch (err) {
                console.error('Inventory deduction error for', productId, err);
            }
        }
    }

    async restoreInventory(orderId) {
        const order = this.orders[orderId];
        if (!order || !Array.isArray(order.items)) return;
        if (!window.firebaseDB) return;
        const { ref, get, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        for (const item of order.items) {
            const productId = item.productId || item.id;
            const qty = item.quantity || 1;
            if (!productId) continue;
            try {
                const snap = await get(ref(window.firebaseDB, `products/${productId}`));
                if (snap.exists()) {
                    const product = snap.val();
                    const currentStock = product.stock || 0;
                    await update(ref(window.firebaseDB, `products/${productId}`), {
                        stock: currentStock + qty,
                        lastStockUpdate: Date.now()
                    });
                }
            } catch (err) {
                console.error('Inventory restore error:', err);
            }
        }
    }

    showLowStockAlert(productName, stock) {
        const alert = document.createElement('div');
        alert.className = 'low-stock-alert';
        alert.innerHTML = `⚠️ <strong>Low Stock:</strong> "${productName}" only ${stock} left!`;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 6000);
    }

    async saveLowStockAlert(productId, productName, stock) {
        if (!window.firebaseDB) return;
        const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        await push(ref(window.firebaseDB, 'admin-alerts/low-stock'), {
            productId, productName, stock, timestamp: Date.now(), read: false
        });
    }

    // ─────────────────────────────────────────
    // CUSTOMER NOTIFICATION
    // ─────────────────────────────────────────
    async notifyCustomer(orderId, newStatus) {
        const order = this.orders[orderId];
        if (!order) return;
        if (!window.firebaseDB) return;
        const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        const messages = {
            processing: `Your order #${orderId.slice(-6).toUpperCase()} is being processed. We'll ship it soon! 🎉`,
            shipped:    `Great news! Your order #${orderId.slice(-6).toUpperCase()} has been shipped. 🚚`,
            delivered:  `Your order #${orderId.slice(-6).toUpperCase()} has been delivered. Thank you! ✅`,
            cancelled:  `Your order #${orderId.slice(-6).toUpperCase()} has been cancelled. Contact us for help.` 
        };

        const msg = messages[newStatus];
        if (!msg) return;

        const customerId = order.userId || order.customerId;
        if (customerId) {
            await push(ref(window.firebaseDB, `user-notifications/${customerId}`), {
                message: msg,
                orderId: orderId,
                status: newStatus,
                timestamp: Date.now(),
                read: false
            });
        }

        // Also save to admin message log
        await push(ref(window.firebaseDB, 'order-notifications'), {
            orderId,
            customerName: order.customerName || order.customer || 'Unknown',
            message: msg,
            status: newStatus,
            timestamp: Date.now()
        });
    }

    // ─────────────────────────────────────────
    // ORDER DETAIL MODAL
    // ─────────────────────────────────────────
    viewOrder(orderId) {
        const order = this.orders[orderId];
        if (!order) return;
        const cfg = this.getStatusConfig();
        const statusHistory = order.statusHistory || {};
        const items = Array.isArray(order.items) ? order.items : [];

        const timeline = ['pending','processing','shipped','delivered']
            .map(s => {
                const done = statusHistory[s] || (order.status === s);
                const time = statusHistory[s] ? new Date(statusHistory[s]).toLocaleString() : '';
                return `
                <div class="timeline-step ${done ? 'done' : ''}">
                    <div class="timeline-dot">${cfg[s]?.icon || '•'}</div>
                    <div><strong>${cfg[s]?.label || s}</strong>${time ? `<br><small>${time}</small>` : ''}</div>
                </div>`;
            }).join('');

        const itemsHtml = items.map(item => `
            <div class="modal-item-row">
                <span>${item.name || item.productId || '—'}</span>
                <span>x${item.quantity || 1}</span>
                <span>TK ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
            </div>`).join('');

        document.getElementById('orderModalContent').innerHTML = `
            <div class="modal-section">
                <h4>Order #${orderId.slice(-6).toUpperCase()}</h4>
                <p><strong>Customer:</strong> ${order.customerName || order.customer || '—'}</p>
                <p><strong>Phone:</strong> ${order.customerPhone || order.phone || '—'}</p>
                <p><strong>Address:</strong> ${order.address || order.deliveryAddress || '—'}</p>
                <p><strong>Date:</strong> ${order.timestamp ? new Date(order.timestamp).toLocaleString() : '—'}</p>
            </div>
            <div class="modal-section">
                <h4>Order Status</h4>
                ${this.statusBadge(order.status || 'pending')}
                <div class="timeline">${timeline}</div>
            </div>
            <div class="modal-section">
                <h4>Items</h4>
                ${itemsHtml || '<p>No items data</p>'}
                <hr>
                <div class="modal-item-row"><strong>Total</strong><span></span><strong>TK ${(order.totalAmount || order.total || 0).toLocaleString()}</strong></div>
            </div>
            <div class="modal-section">
                <h4>Update Status</h4>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${Object.entries(cfg).map(([s, c]) =>
                        `<button class="obtn obtn-primary" onclick="orderSystem.updateStatus('${orderId}','${s}');orderSystem.closeModal()"
                         style="background:${c.color}">${c.icon} ${c.label}</button>`
                    ).join('')}
                </div>
            </div>
            <div class="modal-section">
                <h4>Add Note</h4>
                <textarea id="orderNoteInput" placeholder="Add note about this order..." style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;min-height:70px;font-size:14px;"></textarea>
                <button class="obtn obtn-primary" onclick="orderSystem.saveNote('${orderId}')" style="margin-top:8px">Save Note</button>
                ${order.notes ? `<p style="margin-top:8px;color:#6b7280;font-size:13px">Previous note: ${order.notes}</p>` : ''}
            </div>
        `;
        document.getElementById('orderModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('orderModal').style.display = 'none';
    }

    async saveNote(orderId) {
        const note = document.getElementById('orderNoteInput')?.value?.trim();
        if (!note) return;
        if (!window.firebaseDB) return;
        const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        await update(ref(window.firebaseDB, `orders/${orderId}`), { notes: note, noteUpdatedAt: Date.now() });
        this.showToast('Note saved', 'success');
        this.closeModal();
    }

    // ─────────────────────────────────────────
    // EXPORT
    // ─────────────────────────────────────────
    exportCSV() {
        const list = this.getFilteredOrders();
        const rows = [['Order ID','Customer','Phone','Items','Total','Status','Date']];
        list.forEach(o => {
            rows.push([
                o._id.slice(-6).toUpperCase(),
                o.customerName || o.customer || '',
                o.customerPhone || o.phone || '',
                Array.isArray(o.items) ? o.items.length : '',
                o.totalAmount || o.total || 0,
                o.status || '',
                o.timestamp ? new Date(o.timestamp).toLocaleDateString() : ''
            ]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    }

    // ─────────────────────────────────────────
    // TOAST
    // ─────────────────────────────────────────
    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `order-toast ${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
    }
}

// Initialize
window.orderSystem = new OrderManagementSystem();
document.addEventListener('DOMContentLoaded', () => window.orderSystem.init());
