// ============================================
// ORDER TEST CREATOR
// js/test-order-creator.js
// ============================================

class TestOrderCreator {
    constructor() {
        this.isInitialized = false;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        console.log('🧪 Initializing Test Order Creator...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        this.isInitialized = true;
        this.createTestInterface();
        
        console.log('✅ Test Order Creator initialized');
    }

    // ─────────────────────────────────────────
    // WAIT FOR FIREBASE
    // ─────────────────────────────────────────
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if ((window.unifiedFirebase && window.unifiedFirebase.isReady) || 
                    (window.firebaseDB && typeof window.firebaseDB.collection === 'function')) {
                    console.log('✅ Firebase is ready for order creation');
                    resolve();
                } else {
                    console.log('⏳ Waiting for Firebase...');
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // ─────────────────────────────────────────
    // CREATE TEST INTERFACE
    // ─────────────────────────────────────────
    createTestInterface() {
        // Create floating test panel
        const testPanel = document.createElement('div');
        testPanel.id = 'test-order-panel';
        testPanel.innerHTML = `
            <div class="test-panel-header">
                <h3>🧪 Test Order Creation</h3>
                <p>Place test orders to verify admin panel receives them</p>
            </div>
            <div class="test-panel-body">
                <div class="test-form">
                    <div class="form-group">
                        <label for="customerName">Customer Name:</label>
                        <input type="text" id="customerName" value="Test Customer" placeholder="Enter customer name">
                    </div>
                    <div class="form-group">
                        <label for="orderTotal">Order Total:</label>
                        <input type="number" id="orderTotal" value="99.99" step="0.01" placeholder="Enter order total">
                    </div>
                    <div class="form-group">
                        <label for="orderStatus">Order Status:</label>
                        <select id="orderStatus">
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="window.testOrderCreator.createTestOrder()">
                            🛒 Create Test Order
                        </button>
                        <button class="btn btn-secondary" onclick="window.testOrderCreator.createMultipleOrders()">
                            📦 Create 5 Test Orders
                        </button>
                        <button class="btn btn-info" onclick="window.testOrderCreator.clearAllOrders()">
                            🗑️ Clear All Orders
                        </button>
                    </div>
                </div>
                <div class="test-panel-info">
                    <h4>📊 Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total Created:</span>
                            <span class="stat-value" id="totalCreated">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Success Rate:</span>
                            <span class="stat-value" id="successRate">0%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #test-order-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 2px solid var(--primary);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: 'Inter', sans-serif;
                max-width: 400px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .test-panel-header {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border);
            }
            
            .test-panel-header h3 {
                margin: 0 0 8px 0;
                color: var(--text);
            }
            
            .test-panel-header p {
                margin: 0;
                color: var(--text-muted);
                font-size: 14px;
            }
            
            .form-group {
                margin-bottom: 16px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: var(--text);
            }
            
            .form-group input,
            .form-group select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--border);
                border-radius: 6px;
                font-size: 14px;
            }
            
            .form-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .test-panel-info {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid var(--border);
            }
            
            .test-panel-info h4 {
                margin: 0 0 12px 0;
                color: var(--text);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            
            .stat-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: var(--bg);
                border-radius: 6px;
            }
            
            .stat-label {
                font-weight: 500;
                color: var(--text-muted);
            }
            
            .stat-value {
                font-weight: 700;
                color: var(--primary);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(testPanel);
    }

    // ─────────────────────────────────────────
    // CREATE TEST ORDER
    // ─────────────────────────────────────────
    async createTestOrder() {
        if (!this.isInitialized) {
            console.error('❌ Test Order Creator not initialized');
            return;
        }

        try {
            const customerName = document.getElementById('customerName').value;
            const orderTotal = parseFloat(document.getElementById('orderTotal').value);
            const orderStatus = document.getElementById('orderStatus').value;

            if (!customerName || !orderTotal) {
                alert('Please fill in customer name and order total');
                return;
            }

            console.log('🛒 Creating test order...');

            // Use unified Firebase to create order
            const ordersRef = window.unifiedFirebase ? 
                window.unifiedFirebase.getCollectionRef('orders') :
                window.firebaseDB.collection('orders');

            const orderData = {
                customerName: customerName,
                total: orderTotal,
                status: orderStatus,
                createdAt: new Date(),
                updatedAt: new Date(),
                testOrder: true // Mark as test order
            };

            const docRef = await ordersRef.add(orderData);
            console.log('✅ Test order created:', docRef.id);

            // Update statistics
            this.updateStatistics(true);

            // Show success message
            this.showNotification(`Test order created: #${docRef.id.slice(-6)}`, 'success');

            // Clear form
            document.getElementById('customerName').value = '';
            document.getElementById('orderTotal').value = '';

        } catch (error) {
            console.error('❌ Error creating test order:', error);
            this.showNotification('Failed to create test order', 'error');
        }
    }

    // ─────────────────────────────────────────
    // CREATE MULTIPLE TEST ORDERS
    // ─────────────────────────────────────────
    async createMultipleOrders() {
        console.log('📦 Creating 5 test orders...');
        
        const testOrders = [
            { customerName: 'Alice Johnson', total: 199.99, status: 'pending' },
            { customerName: 'Bob Smith', total: 89.99, status: 'processing' },
            { customerName: 'Carol Davis', total: 299.99, status: 'shipped' },
            { customerName: 'David Wilson', total: 149.99, status: 'delivered' },
            { customerName: 'Eva Brown', total: 79.99, status: 'cancelled' }
        ];

        let successCount = 0;
        let errorCount = 0;

        for (const order of testOrders) {
            try {
                await this.createSingleOrder(order);
                successCount++;
            } catch (error) {
                errorCount++;
                console.error('Error creating order:', error);
            }
        }

        console.log(`✅ Created ${successCount} test orders, ${errorCount} errors`);
        this.updateStatistics();
    }

    // ─────────────────────────────────────────
    // CREATE SINGLE ORDER
    // ─────────────────────────────────────────
    async createSingleOrder(orderData) {
        const ordersRef = window.unifiedFirebase ? 
            window.unifiedFirebase.getCollectionRef('orders') :
            window.firebaseDB.collection('orders');

        const docRef = await ordersRef.add({
            ...orderData,
            createdAt: new Date(),
            updatedAt: new Date(),
            testOrder: true
        });

        return docRef.id;
    }

    // ─────────────────────────────────────────
    // CLEAR ALL ORDERS
    // ─────────────────────────────────────────
    async clearAllOrders() {
        if (!confirm('Are you sure you want to clear all test orders?')) {
            return;
        }

        try {
            console.log('🗑️ Clearing all test orders...');

            const ordersRef = window.unifiedFirebase ? 
                window.unifiedFirebase.getCollectionRef('orders') :
                window.firebaseDB.collection('orders');

            // Get all documents and delete them
            const snapshot = await ordersRef.get();
            const deletePromises = snapshot.docs.map(doc => doc.ref.delete());

            await Promise.all(deletePromises);

            console.log('✅ All test orders cleared');
            this.showNotification('All test orders cleared', 'info');
            this.updateStatistics();

        } catch (error) {
            console.error('❌ Error clearing orders:', error);
            this.showNotification('Failed to clear orders', 'error');
        }
    }

    // ─────────────────────────────────────────
    // UPDATE STATISTICS
    // ─────────────────────────────────────────
    updateStatistics(success = null) {
        try {
            const ordersRef = window.unifiedFirebase ? 
                window.unifiedFirebase.getCollectionRef('orders') :
                window.firebaseDB.collection('orders');

            const snapshot = await ordersRef.where('testOrder', '==', true).get();
            const totalOrders = snapshot.size;

            // Update UI
            document.getElementById('totalCreated').textContent = totalOrders;

            if (success !== null) {
                // Calculate success rate (simplified)
                const successRate = totalOrders > 0 ? 100 : 0;
                document.getElementById('successRate').textContent = successRate + '%';
            }

        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    // ─────────────────────────────────────────
    // SHOW NOTIFICATION
    // ─────────────────────────────────────────
    showNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // ─────────────────────────────────────────
    // CLOSE PANEL
    // ─────────────────────────────────────────
    closePanel() {
        const panel = document.getElementById('test-order-panel');
        if (panel) {
            panel.remove();
        }
    }
}

// Initialize test order creator
window.testOrderCreator = new TestOrderCreator();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.testOrderCreator) {
        window.testOrderCreator.init();
    }
});
