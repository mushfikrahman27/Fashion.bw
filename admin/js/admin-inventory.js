// ============================================
// INVENTORY SYNC SYSTEM
// admin-inventory.js
// Connects to: admin-orders.js (orderSystem)
// ============================================

import { 
    COLLECTIONS, 
    getCollectionRef, 
    getDocRef 
} from './firebase-paths.js';

class InventorySystem {
    constructor() {
        this.products = {};
        this.alerts = [];
        this.historyLog = [];
        this.LOW_STOCK_THRESHOLD = 5; // default, overridable per product
    }

    // ─────────────────────────────────────────
    // INIT — real-time listener on products
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) { console.warn('Firebase not ready'); return; }

        // Live product stock listener
        const productsRef = getCollectionRef('PRODUCTS');
        productsRef.onSnapshot((snapshot) => {
            this.products = {};
            snapshot.forEach(doc => {
                this.products[doc.id] = { ...doc.data(), _id: doc.id };
            });
            this.renderInventoryTable();
            this.renderAlerts();
        });

        // Live alerts listener
        const alertsRef = getCollectionRef('ALERTS');
        alertsRef.onSnapshot((snapshot) => {
            this.alerts = [];
            snapshot.forEach(doc => {
                this.alerts.push({ ...doc.data(), _id: doc.id });
            });
            this.renderAlerts();
            this.updateAlertBadge();
        });

        // Load history log
        this.loadHistory();
    }

    // ─────────────────────────────────────────
    // RENDER INVENTORY TABLE
    // ─────────────────────────────────────────
    renderInventoryTable() {
        const el = document.getElementById('inventoryTableBody');
        if (!el) return;

        const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase();
        const filter = document.getElementById('inventoryFilterSelect')?.value || 'all';

        let products = Object.entries(this.products).map(([id, p]) => ({ ...p, _id: id }));

        if (search) products = products.filter(p =>
            (p.name || '').toLowerCase().includes(search) ||
            (p.category || '').toLowerCase().includes(search)
        );

        if (filter === 'low')      products = products.filter(p => this.getStockLevel(p) === 'low');
        if (filter === 'out')      products = products.filter(p => this.getStockLevel(p) === 'out');
        if (filter === 'healthy')  products = products.filter(p => this.getStockLevel(p) === 'healthy');

        // Summary counts
        this.renderInventorySummary(Object.values(this.products));

        if (products.length === 0) {
            el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#9ca3af">No products found</td></tr>`;
            return;
        }

        el.innerHTML = products.map(p => {
            const stock = p.stock ?? p.quantity ?? 0;
            const threshold = p.lowStockThreshold || this.LOW_STOCK_THRESHOLD;
            const level = this.getStockLevel(p);
            const badge = this.stockBadge(level, stock);
            const lastUpdate = p.lastStockUpdate
                ? new Date(p.lastStockUpdate).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
                : '—';

            return `
            <tr class="inv-row">
                <td>
                    ${p.image ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px">` : ''}
                    <strong>${p.name || p._id}</strong>
                    ${p.category ? `<br><small style="color:#9ca3af">${p.category}</small>` : ''}
                </td>
                <td><strong>TK ${(p.price || 0).toLocaleString()}</strong></td>
                <td>${badge}</td>
                <td>
                    <div class="stock-adjuster">
                        <button class="adj-btn" onclick="inventorySystem.adjustStock('${p._id}', -1)">−</button>
                        <input type="number" class="stock-input" value="${stock}" min="0"
                            onchange="inventorySystem.setStock('${p._id}', this.value)"
                            onblur="inventorySystem.setStock('${p._id}', this.value)" />
                        <button class="adj-btn" onclick="inventorySystem.adjustStock('${p._id}', 1)">+</button>
                    </div>
                </td>
                <td>
                    <input type="number" class="threshold-input" value="${threshold}" min="1"
                        title="Low stock alert threshold"
                        onchange="inventorySystem.setThreshold('${p._id}', this.value)" />
                </td>
                <td style="color:#9ca3af;font-size:13px">${lastUpdate}</td>
                <td>
                    <button class="obtn obtn-view" onclick="inventorySystem.viewHistory('${p._id}', '${p.name || p._id}')">📋 History</button>
                    <button class="obtn obtn-primary" onclick="inventorySystem.restockModal('${p._id}', '${p.name || p._id}', ${stock})">📦 Restock</button>
                </td>
            </tr>`;
        }).join('');
    }

    // ─────────────────────────────────────────
    // SUMMARY STATS
    // ─────────────────────────────────────────
    renderInventorySummary(products) {
        const el = document.getElementById('inventorySummaryBar');
        if (!el) return;
        const total   = products.length;
        const out     = products.filter(p => this.getStockLevel(p) === 'out').length;
        const low     = products.filter(p => this.getStockLevel(p) === 'low').length;
        const healthy = products.filter(p => this.getStockLevel(p) === 'healthy').length;
        const totalValue = products.reduce((s, p) => s + ((p.stock ?? p.quantity ?? 0) * (p.price || 0)), 0);

        el.innerHTML = `
            <div class="istat-card" onclick="inventorySystem.setFilter('all')">
                <div class="istat-val">${total}</div>
                <div class="istat-lbl">Total Products</div>
            </div>
            <div class="istat-card healthy" onclick="inventorySystem.setFilter('healthy')">
                <div class="istat-val">${healthy}</div>
                <div class="istat-lbl">✅ Healthy Stock</div>
            </div>
            <div class="istat-card low" onclick="inventorySystem.setFilter('low')">
                <div class="istat-val">${low}</div>
                <div class="istat-lbl">⚠️ Low Stock</div>
            </div>
            <div class="istat-card out" onclick="inventorySystem.setFilter('out')">
                <div class="istat-val">${out}</div>
                <div class="istat-lbl">❌ Out of Stock</div>
            </div>
            <div class="istat-card value">
                <div class="istat-val">TK ${totalValue.toLocaleString()}</div>
                <div class="istat-lbl">💰 Stock Value</div>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // STOCK LEVEL HELPERS
    // ─────────────────────────────────────────
    getStockLevel(product) {
        const stock = product.stock ?? product.quantity ?? 0;
        const threshold = product.lowStockThreshold || this.LOW_STOCK_THRESHOLD;
        if (stock <= 0)         return 'out';
        if (stock <= threshold) return 'low';
        return 'healthy';
    }

    stockBadge(level, stock) {
        const map = {
            out:     { bg: '#fee2e2', color: '#991b1b', label: `❌ Out of Stock` },
            low:     { bg: '#fef3c7', color: '#92400e', label: `⚠️ Low (${stock})` },
            healthy: { bg: '#d1fae5', color: '#065f46', label: `✅ In Stock (${stock})` }
        };
        const c = map[level] || map.healthy;
        return `<span style="background:${c.bg};color:${c.color};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600">${c.label}</span>`;
    }

    setFilter(f) {
        const sel = document.getElementById('inventoryFilterSelect');
        if (sel) sel.value = f;
        this.renderInventoryTable();
    }

    // ─────────────────────────────────────────
    // STOCK ADJUSTMENTS
    // ─────────────────────────────────────────
    async adjustStock(productId, delta) {
        const product = this.products[productId];
        if (!product) return;
        const current = product.stock ?? product.quantity ?? 0;
        const newStock = Math.max(0, current + delta);
        await this.setStock(productId, newStock);
    }

    async setStock(productId, newValue) {
        const stock = Math.max(0, parseInt(newValue) || 0);
        const product = this.products[productId];
        if (!product) return;
        if (!window.firebaseDB) return;

        const oldStock = product.stock ?? product.quantity ?? 0;
        if (oldStock === stock) return; // no change

        const { ref, update, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        await update(ref(window.firebaseDB, `products/${productId}`), {
            stock: stock,
            lastStockUpdate: Date.now()
        });

        // Log the change
        await push(ref(window.firebaseDB, `inventory-history/${productId}`), {
            productId,
            productName: product.name || productId,
            oldStock,
            newStock: stock,
            change: stock - oldStock,
            reason: 'manual',
            timestamp: Date.now()
        });

        // Check low stock
        const threshold = product.lowStockThreshold || this.LOW_STOCK_THRESHOLD;
        if (stock <= threshold && stock > 0) {
            this.showToast(`⚠️ Low stock: "${product.name}" — only ${stock} left`, 'warning');
        }
        if (stock === 0) {
            this.showToast(`❌ "${product.name}" is now OUT OF STOCK`, 'error');
        }
    }

    // ─────────────────────────────────────────
    // TRANSACTION-BASED STOCK CHECK
    // ─────────────────────────────────────────
    async checkAndDeductStock(productId, quantity) {
        const productRef = getDocRef('PRODUCTS', productId);
        
        try {
            const result = await window.firebaseDB.runTransaction(async (transaction) => {
                const productDoc = await transaction.get(productRef);
                
                if (!productDoc.exists) {
                    throw new Error('Product not found');
                }
                
                const product = productDoc.data();
                const currentStock = product.stock || 0;
                
                // Check if sufficient stock
                if (currentStock < quantity) {
                    throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`);
                }
                
                // Prevent negative stock
                const newStock = Math.max(0, currentStock - quantity);
                
                // Update product stock
                transaction.update(productRef, {
                    stock: newStock,
                    lastStockUpdate: Date.now(),
                    lastDeduction: {
                        quantity: quantity,
                        timestamp: Date.now()
                    }
                });
                
                return {
                    success: true,
                    oldStock: currentStock,
                    newStock: newStock,
                    deducted: quantity
                };
            });
            
            // Log the transaction
            await this.logStockTransaction(productId, result);
            
            // Check for low stock alert
            if (result.newStock <= this.LOW_STOCK_THRESHOLD) {
                await this.createLowStockAlert(productId, result.newStock);
            }
            
            return result;
            
        } catch (error) {
            console.error('Stock check error:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────
    // LOG STOCK TRANSACTION
    // ─────────────────────────────────────────
    async logStockTransaction(productId, transaction) {
        const historyRef = getCollectionRef('INVENTORY_HISTORY');
        await historyRef.add({
            productId: productId,
            type: 'deduction',
            quantity: transaction.deducted,
            oldStock: transaction.oldStock,
            newStock: transaction.newStock,
            timestamp: Date.now(),
            userId: window.firebaseAuth?.currentUser?.uid || 'unknown'
        });
    }

    // ─────────────────────────────────────────
    // CREATE LOW STOCK ALERT
    // ─────────────────────────────────────────
    async createLowStockAlert(productId, stockLevel) {
        const alertsRef = getCollectionRef('ALERTS');
        await alertsRef.add({
            type: 'low_stock',
            productId: productId,
            stockLevel: stockLevel,
            threshold: this.LOW_STOCK_THRESHOLD,
            timestamp: Date.now(),
            acknowledged: false
        });
        
        this.showToast(`⚠️ Low stock alert: Product ID ${productId} has only ${stockLevel} items left`, 'warning');
    }

    // ─────────────────────────────────────────
    // REAL-TIME STOCK SYNC
    // ─────────────────────────────────────────
    startRealTimeSync() {
        const productsRef = getCollectionRef('PRODUCTS');
        
        // Listen for stock changes
        productsRef.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const product = change.doc.data();
                    const productId = change.doc.id;
                    
                    // Update UI immediately
                    this.updateStockRow(productId, product.stock);
                    
                    // Check for alerts
                    if (product.stock <= this.LOW_STOCK_THRESHOLD) {
                        this.highlightLowStockRow(productId);
                    }
                    
                    if (product.stock === 0) {
                        this.showOutOfStockBadge(productId);
                    }
                }
            });
        });
    }

    // ─────────────────────────────────────────
    // UPDATE STOCK ROW IN UI
    // ─────────────────────────────────────────
    updateStockRow(productId, newStock) {
        const row = document.getElementById(`stock-row-${productId}`);
        if (!row) return;
        
        const stockCell = row.querySelector('.stock-value');
        if (stockCell) {
            stockCell.textContent = newStock;
            stockCell.className = 'stock-value';
            
            if (newStock <= this.LOW_STOCK_THRESHOLD && newStock > 0) {
                stockCell.classList.add('low-stock');
            } else if (newStock === 0) {
                stockCell.classList.add('out-of-stock');
            }
        }
    }

    // ─────────────────────────────────────────
    // RESTOCK MODAL
    // ─────────────────────────────────────────
    restockModal(productId, productName, currentStock) {
        document.getElementById('restockModalContent').innerHTML = `
            <h4>📦 Restock: ${productName}</h4>
            <p style="color:#6b7280;margin-bottom:16px">Current stock: <strong>${currentStock}</strong></p>
            <label style="font-size:14px;font-weight:600">Add quantity:</label>
            <input type="number" id="restockQtyInput" value="10" min="1"
                style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:16px;margin:8px 0 4px" />
            <label style="font-size:14px;font-weight:600">Reason (optional):</label>
            <input type="text" id="restockReasonInput" placeholder="e.g. New shipment, Return..."
                style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin:8px 0 16px" />
            <div style="display:flex;gap:8px">
                <button class="obtn obtn-primary" style="flex:1;padding:10px"
                    onclick="inventorySystem.confirmRestock('${productId}', ${currentStock})">✅ Confirm Restock</button>
                <button class="obtn" style="flex:1;padding:10px;background:#f3f4f6"
                    onclick="inventorySystem.closeRestockModal()">Cancel</button>
            </div>
        `;
        document.getElementById('restockModal').style.display = 'flex';
    }

    async confirmRestock(productId, currentStock) {
        const qty = parseInt(document.getElementById('restockQtyInput')?.value || 0);
        const reason = document.getElementById('restockReasonInput')?.value || 'restock';
        if (!qty || qty <= 0) { this.showToast('Enter a valid quantity', 'error'); return; }

        const newStock = currentStock + qty;
        const product = this.products[productId];
        if (!window.firebaseDB) return;
        const { ref, update, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        await update(ref(window.firebaseDB, `products/${productId}`), {
            stock: newStock,
            lastStockUpdate: Date.now()
        });

        await push(ref(window.firebaseDB, `inventory-history/${productId}`), {
            productId,
            productName: product?.name || productId,
            oldStock: currentStock,
            newStock,
            change: qty,
            reason,
            timestamp: Date.now()
        });

        this.closeRestockModal();
        this.showToast(`✅ Restocked! New stock: ${newStock}`, 'success');
    }

    closeRestockModal() {
        document.getElementById('restockModal').style.display = 'none';
    }

    // ─────────────────────────────────────────
    // HISTORY LOG
    // ─────────────────────────────────────────
    async loadHistory() {
        if (!window.firebaseDB) return;
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const snap = await get(ref(window.firebaseDB, 'inventory-history'));
        if (!snap.exists()) return;
        const all = [];
        snap.forEach(productSnap => {
            productSnap.forEach(entry => {
                all.push({ _id: entry.key, ...entry.val() });
            });
        });
        this.historyLog = all.sort((a, b) => b.timestamp - a.timestamp);
    }

    async viewHistory(productId, productName) {
        if (!window.firebaseDB) return;
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const snap = await get(ref(window.firebaseDB, `inventory-history/${productId}`));

        let rows = '';
        if (snap.exists()) {
            const entries = [];
            snap.forEach(e => entries.push(e.val()));
            entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30).forEach(e => {
                const change = e.change >= 0 ? `<span style="color:#10b981">+${e.change}</span>` : `<span style="color:#ef4444">${e.change}</span>`;
                rows += `
                <tr>
                    <td>${new Date(e.timestamp).toLocaleString()}</td>
                    <td>${e.oldStock ?? '—'} → ${e.newStock ?? '—'}</td>
                    <td>${change}</td>
                    <td style="color:#6b7280">${e.reason || '—'}</td>
                </tr>`;
            });
        } else {
            rows = `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:20px">No history yet</td></tr>`;
        }

        document.getElementById('historyModalContent').innerHTML = `
            <h4>📋 Stock History: ${productName}</h4>
            <div style="overflow-x:auto;margin-top:12px">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:#f9fafb">
                            <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb">Date</th>
                            <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb">Stock Change</th>
                            <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb">Delta</th>
                            <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb">Reason</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <button class="obtn" style="margin-top:16px;background:#f3f4f6;width:100%;padding:10px"
                onclick="inventorySystem.closeHistoryModal()">Close</button>
        `;
        document.getElementById('historyModal').style.display = 'flex';
    }

    closeHistoryModal() { document.getElementById('historyModal').style.display = 'none'; }

    // ─────────────────────────────────────────
    // ALERTS PANEL
    // ─────────────────────────────────────────
    renderAlerts() {
        const el = document.getElementById('inventoryAlertsList');
        if (!el) return;
        const unread = this.alerts.filter(a => !a.read).sort((a, b) => b.timestamp - a.timestamp);
        if (unread.length === 0) {
            el.innerHTML = `<p style="text-align:center;color:#9ca3af;padding:20px">No active alerts 🎉</p>`;
            return;
        }
        el.innerHTML = unread.map(a => `
            <div class="alert-row">
                <div>
                    <strong>⚠️ ${a.productName}</strong>
                    <div style="font-size:12px;color:#92400e">Only ${a.stock} units left</div>
                    <div style="font-size:11px;color:#9ca3af">${new Date(a.timestamp).toLocaleString()}</div>
                </div>
                <button class="obtn" style="background:#d1fae5;color:#065f46;font-size:12px"
                    onclick="inventorySystem.dismissAlert('${a._id}')">Dismiss</button>
            </div>
        `).join('');
    }

    updateAlertBadge() {
        const badge = document.getElementById('inventoryAlertBadge');
        if (!badge) return;
        const unread = this.alerts.filter(a => !a.read).length;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'inline-flex' : 'none';
    }

    async dismissAlert(alertId) {
        if (!window.firebaseDB) return;
        const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        await update(ref(window.firebaseDB, `admin-alerts/low-stock/${alertId}`), { read: true });
    }

    async dismissAllAlerts() {
        const promises = this.alerts.filter(a => !a.read).map(a => this.dismissAlert(a._id));
        await Promise.all(promises);
        this.showToast('All alerts dismissed', 'success');
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
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
    }
}

window.inventorySystem = new InventorySystem();
document.addEventListener('DOMContentLoaded', () => window.inventorySystem.init());
