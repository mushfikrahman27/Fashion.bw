/* ===================================
   INVENTORY MANAGEMENT SYSTEM
   =================================== */

class InventoryManager {
    constructor() {
        this.inventory = [];
        this.filteredInventory = [];
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('📦 Inventory Manager initialized');
    }
    
    setupEventListeners() {
        // Inventory filters
        document.getElementById('inventorySearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('inventoryCategoryFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('stockStatusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('stockAlertFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Action buttons
        document.getElementById('bulkUpdateStock')?.addEventListener('click', () => {
            this.openBulkStockModal();
        });
        
        document.getElementById('addStockBtn')?.addEventListener('click', () => {
            this.openStockModal();
        });
        
        // Modal buttons
        document.getElementById('updateStockBtn')?.addEventListener('click', () => {
            this.updateStock();
        });
        
        document.getElementById('processBulkStockBtn')?.addEventListener('click', () => {
            this.processBulkStockUpdate();
        });
    }
    
    async loadInventory() {
        try {
            console.log('🔄 Loading inventory data...');
            
            // Get products from main product catalog
            if (window.mainProductCatalog) {
                await window.mainProductCatalog.loadProductCatalog();
                this.inventory = window.mainProductCatalog.products.map(product => ({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    subCategory: product.subCategory,
                    stock: parseInt(product.stock) || 0,
                    status: this.getStockStatus(product.stock),
                    stockValue: this.calculateStockValue(product),
                    updatedAt: product.updatedAt || Date.now()
                }));
            }
            
            this.applyFilters();
            console.log(`✅ Loaded ${this.inventory.length} inventory items`);
            
        } catch (error) {
            console.error('❌ Error loading inventory:', error);
            this.showToast('Failed to load inventory', 'error');
        }
    }
    
    handleSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.applyFilters();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        this.filteredInventory = this.inventory.filter(item => {
            return (
                (item.name && item.name.toLowerCase().includes(searchLower)) ||
                (item.category && item.category.toLowerCase().includes(searchLower)) ||
                (item.subCategory && item.subCategory.toLowerCase().includes(searchLower))
            );
        });
        
        this.renderInventory();
        console.log(`🔍 Inventory search results: ${this.filteredInventory.length} items`);
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || '';
        const stockStatusFilter = document.getElementById('stockStatusFilter')?.value || '';
        const stockAlertFilter = document.getElementById('stockAlertFilter')?.value || '';
        
        this.filteredInventory = this.inventory.filter(item => {
            // Category filter
            if (categoryFilter && item.category !== categoryFilter) {
                return false;
            }
            
            // Stock status filter
            if (stockStatusFilter) {
                const itemStatus = this.getStockStatus(item.stock);
                if (stockStatusFilter === 'in_stock' && itemStatus !== 'in_stock') return false;
                if (stockStatusFilter === 'low_stock' && itemStatus !== 'low_stock') return false;
                if (stockStatusFilter === 'out_of_stock' && itemStatus !== 'out_of_stock') return false;
            }
            
            // Stock alert filter
            if (stockAlertFilter) {
                if (stockAlertFilter === 'low' && item.stock >= 10) return false;
                if (stockAlertFilter === 'out' && item.stock > 0) return false;
            }
            
            return true;
        });
        
        this.renderInventory();
    }
    
    getStockStatus(stock) {
        const stockLevel = parseInt(stock) || 0;
        if (stockLevel === 0) return 'out_of_stock';
        if (stockLevel < 10) return 'low_stock';
        return 'in_stock';
    }
    
    calculateStockValue(product) {
        const stock = parseInt(product.stock) || 0;
        const price = parseFloat(product.price) || 0;
        return stock * price;
    }
    
    renderInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        const emptyState = document.getElementById('inventoryEmpty');
        const loadingState = document.getElementById('inventoryLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredInventory.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = this.filteredInventory.map(item => `
            <tr>
                <td>
                    <div class="product-name-cell">
                        <strong>${item.name}</strong>
                        <div class="product-sku-cell">ID: ${item.id}</div>
                    </div>
                </td>
                <td>
                    <span class="category-badge ${item.category.toLowerCase()}">${item.category}</span>
                    ${item.subCategory ? `<br><small>${item.subCategory}</small>` : ''}
                </td>
                <td>
                    <span class="stock-badge ${this.getStockBadgeClass(item.stock)}">
                        ${item.stock} units
                    </span>
                </td>
                <td>
                    <span class="status-pill ${item.status}">
                        ${item.status.replace('_', ' ').toUpperCase()}
                    </span>
                </td>
                <td>
                    <div class="price-display">$${item.stockValue.toFixed(2)}</div>
                </td>
                <td>
                    ${new Date(item.updatedAt).toLocaleDateString()}
                </td>
                <td>
                    <div class="product-actions">
                        <button class="quick-action-btn stock" onclick="inventoryManager.openStockModal('${item.id}')" title="Update Stock">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    getStockBadgeClass(stock) {
        const status = this.getStockStatus(stock);
        return `stock-badge ${status.replace('_', '-')}`;
    }
    
    // ===================================
    // STOCK UPDATE WORKFLOW
    // ===================================
    
    openStockModal(productId = null) {
        const item = this.inventory.find(i => i.id == productId);
        if (!item) return;
        
        const modal = document.getElementById('stockModal');
        const productNameInput = document.getElementById('stockProductName');
        const currentStockInput = document.getElementById('currentStock');
        const newStockInput = document.getElementById('newStock');
        
        // Pre-fill form
        if (productNameInput) productNameInput.value = item.name;
        if (currentStockInput) currentStockInput.value = item.stock;
        if (newStockInput) newStockInput.value = '';
        
        // Show modal
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeStockModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('stockModal').style.display = 'none';
        }, 300);
    }
    
    async updateStock() {
        try {
            const productId = document.getElementById('stockProductName')?.value;
            const newStock = parseInt(document.getElementById('newStock')?.value) || 0;
            const reason = document.getElementById('stockUpdateReason')?.value || '';
            
            if (!productId || isNaN(newStock)) {
                this.showToast('Please enter a valid stock quantity', 'error');
                return;
            }
            
            // Find product in main product catalog
            const product = window.mainProductCatalog?.products.find(p => p.id == productId);
            if (!product) {
                this.showToast('Product not found', 'error');
                return;
            }
            
            // Update stock in main product catalog
            await window.mainProductCatalog.quickStockUpdate(productId, newStock);
            
            // Update local inventory
            const itemIndex = this.inventory.findIndex(i => i.id == productId);
            if (itemIndex !== -1) {
                this.inventory[itemIndex].stock = newStock;
                this.inventory[itemIndex].status = this.getStockStatus(newStock);
                this.inventory[itemIndex].updatedAt = Date.now();
            }
            
            this.applyFilters();
            this.closeStockModal();
            
            this.showToast(`Stock updated for ${product.name}`, 'success');
            
        } catch (error) {
            console.error('❌ Error updating stock:', error);
            this.showToast('Failed to update stock', 'error');
        }
    }
    
    openBulkStockModal() {
        const modal = document.getElementById('bulkStockModal');
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeBulkStockModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('bulkStockModal').style.display = 'none';
        }, 300);
    }
    
    async processBulkStockUpdate() {
        try {
            const fileInput = document.getElementById('bulkStockFile');
            const bulkAmount = parseInt(document.getElementById('bulkStockAmount')?.value) || 0;
            
            if (!fileInput.files || fileInput.files.length === 0) {
                if (bulkAmount > 0) {
                    await this.applyBulkStockIncrease(bulkAmount);
                } else {
                    this.showToast('Please select a CSV file or enter an amount', 'error');
                }
                return;
            }
            
            // Process CSV file
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    const updates = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        const [productId, newStock] = lines[i].split(',').map(item => item.trim());
                        
                        if (productId && !isNaN(newStock)) {
                            updates.push({ productId, newStock: parseInt(newStock) });
                        }
                    }
                    
                    if (updates.length > 0) {
                        await this.processBulkUpdates(updates);
                    } else {
                        this.showToast('No valid updates found in CSV file', 'error');
                    }
                    
                } catch (error) {
                    console.error('❌ Error processing CSV:', error);
                    this.showToast('Failed to process CSV file', 'error');
                }
            };
            
            reader.readAsText(file);
            
        } catch (error) {
            console.error('❌ Error in bulk update:', error);
            this.showToast('Failed to process bulk update', 'error');
        }
    }
    
    async applyBulkStockIncrease(amount) {
        try {
            console.log(`📦 Applying bulk stock increase: +${amount} to all products`);
            
            for (const item of this.inventory) {
                const newStock = item.stock + amount;
                await window.mainProductCatalog.quickStockUpdate(item.id, newStock);
                
                // Update local inventory
                item.stock = newStock;
                item.status = this.getStockStatus(newStock);
                item.updatedAt = Date.now();
            }
            
            this.applyFilters();
            this.closeBulkStockModal();
            
            this.showToast(`Bulk stock update completed: +${amount} added to all products`, 'success');
            
        } catch (error) {
            console.error('❌ Error in bulk stock increase:', error);
            this.showToast('Failed to apply bulk update', 'error');
        }
    }
    
    async processBulkUpdates(updates) {
        console.log(`🔄 Processing ${updates.length} bulk stock updates`);
        
        for (const update of updates) {
            const product = window.mainProductCatalog?.products.find(p => p.id == update.productId);
            if (product) {
                await window.mainProductCatalog.quickStockUpdate(update.productId, update.newStock);
                
                // Update local inventory
                const itemIndex = this.inventory.findIndex(i => i.id == update.productId);
                if (itemIndex !== -1) {
                    this.inventory[itemIndex].stock = update.newStock;
                    this.inventory[itemIndex].status = this.getStockStatus(update.newStock);
                    this.inventory[itemIndex].updatedAt = Date.now();
                }
            }
        }
        
        this.applyFilters();
        this.closeBulkStockModal();
        
        this.showToast(`Processed ${updates.length} stock updates`, 'success');
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard) {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

/* ===================================
   ORDER MANAGEMENT SYSTEM
   =================================== */

class OrderManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentEditingOrderId = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('📦 Order Manager initialized');
    }
    
    setupEventListeners() {
        // Order filters
        document.getElementById('orderSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('orderStatusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('orderDateFilter')?.addEventListener('change', (e) => {
            this.handleDateFilter(e.target.value);
        });
        
        document.getElementById('customDateFrom')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('customDateTo')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Action buttons
        document.getElementById('exportOrders')?.addEventListener('click', () => {
            this.exportOrders();
        });
        
        // Modal buttons
        document.getElementById('updateOrderStatusBtn')?.addEventListener('click', () => {
            this.updateOrderStatus();
        });
    }
    
    async loadOrders() {
        try {
            console.log('🔄 Loading orders from Firebase...');
            
            if (window.firebaseDB) {
                await this.loadOrdersFromFirebase();
            } else {
                // Fallback to sample data for demo
                this.loadSampleOrders();
            }
            
            this.applyFilters();
            this.updateOrderSummary();
            
        } catch (error) {
            console.error('❌ Error loading orders:', error);
            this.showToast('Failed to load orders', 'error');
        }
    }
    
    async loadOrdersFromFirebase() {
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const ordersRef = ref(window.firebaseDB, 'orders');
            const snapshot = await get(ordersRef);
            
            if (snapshot.exists()) {
                const firebaseOrders = snapshot.val();
                this.orders = Object.values(firebaseOrders).map(order => this.normalizeOrder(order, Object.keys(firebaseOrders).find(key => firebaseOrders[key] === order)));
                console.log(`✅ Loaded ${this.orders.length} orders from Firebase`);
            } else {
                console.log('⚠️ No orders found in Firebase, using sample data');
                this.loadSampleOrders();
            }
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            this.loadSampleOrders();
        }
    }
    
    // ===================================
    // ORDER NORMALIZATION LAYER
    // ===================================
    
    normalizeOrder(order, firebaseKey) {
        // Handle both website-style orders and legacy admin-style orders
        const isWebsiteOrder = order.customer && typeof order.customer === 'object';
        const isAdminOrder = !isWebsiteOrder;
        
        if (isWebsiteOrder) {
            // Normalize website order structure
            return {
                id: order.orderId || firebaseKey,
                orderId: order.orderId || firebaseKey,
                customerName: order.customer?.name || 'Unknown Customer',
                customerPhone: order.customer?.phone || '',
                customerAddress: order.customer?.address || '',
                customerEmail: order.customer?.email || '',
                notes: order.customer?.note || '',
                items: order.items || [],
                subtotal: order.totals?.subtotal || 0,
                deliveryCharge: order.totals?.deliveryCharge || 0,
                total: order.totals?.total || 0,
                status: order.status || 'pending',
                channel: order.channel || 'direct',
                date: order.createdAt || Date.now(),
                createdAt: order.createdAt || Date.now(),
                updatedAt: order.updatedAt || Date.now(),
                raw: order // Keep original for reference
            };
        } else {
            // Handle legacy admin-style orders
            return {
                id: order.id || firebaseKey,
                orderId: order.orderId || order.id || firebaseKey,
                customerName: order.customer || 'Unknown Customer',
                customerPhone: order.phone || '',
                customerAddress: order.address || '',
                customerEmail: order.email || '',
                notes: order.notes || '',
                items: order.items || [],
                subtotal: order.subtotal || 0,
                deliveryCharge: order.deliveryCharge || 0,
                total: order.total || 0,
                status: order.status || 'pending',
                channel: order.channel || 'direct',
                date: order.date || Date.now(),
                createdAt: order.createdAt || order.date || Date.now(),
                updatedAt: order.updatedAt || Date.now(),
                raw: order // Keep original for reference
            };
        }
    }
    
    loadSampleOrders() {
        // Sample orders for demonstration
        this.orders = [
            {
                id: 'ORD001',
                customer: 'Alice Johnson',
                email: 'alice@example.com',
                items: [
                    { name: 'Luxury Tote Bag', quantity: 1, price: 750 },
                    { name: 'Urban Street Sneaker', quantity: 2, price: 1800 }
                ],
                total: 4350,
                status: 'pending',
                date: Date.now() - 86400000, // 1 day ago
                notes: 'Rush delivery requested'
            },
            {
                id: 'ORD002',
                customer: 'Bob Smith',
                email: 'bob@example.com',
                items: [
                    { name: 'Premium Handbag', quantity: 1, price: 950 }
                ],
                total: 950,
                status: 'processing',
                date: Date.now() - 172800000, // 2 days ago
                notes: 'Payment confirmed'
            },
            {
                id: 'ORD003',
                customer: 'Carol White',
                email: 'carol@example.com',
                items: [
                    { name: 'Dark Aviator', quantity: 1, price: 1200 },
                    { name: 'Smart Analog Watch', quantity: 1, price: 3200 }
                ],
                total: 4400,
                status: 'shipped',
                date: Date.now() - 259200000, // 3 days ago
                notes: 'Tracking number: 123456789'
            }
        ];
        
        console.log('📦 Loaded sample orders for demonstration');
    }
    
    handleSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.applyFilters();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        this.filteredOrders = this.orders.filter(order => {
            return (
                (order.id && order.id.toLowerCase().includes(searchLower)) ||
                (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
                (order.customerEmail && order.customerEmail.toLowerCase().includes(searchLower)) ||
                (order.customerPhone && order.customerPhone.toLowerCase().includes(searchLower))
            );
        });
        
        this.renderOrders();
        console.log(`🔍 Order search results: ${this.filteredOrders.length} orders`);
    }
    
    handleDateFilter(filterType) {
        const customFrom = document.getElementById('customDateFrom');
        const customTo = document.getElementById('customDateTo');
        
        // Show/hide custom date fields
        if (filterType === 'custom') {
            customFrom.style.display = 'block';
            customTo.style.display = 'block';
        } else {
            customFrom.style.display = 'none';
            customTo.style.display = 'none';
        }
        
        this.applyFilters();
    }
    
    applyFilters() {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
        const dateFilter = document.getElementById('orderDateFilter')?.value || '';
        const customFrom = document.getElementById('customDateFrom')?.value;
        const customTo = document.getElementById('customDateTo')?.value;
        
        this.filteredOrders = this.orders.filter(order => {
            // Status filter
            if (statusFilter && order.status !== statusFilter) {
                return false;
            }
            
            // Date filter
            if (dateFilter || customFrom || customTo) {
                const orderDate = new Date(order.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                switch (dateFilter) {
                    case 'today':
                        if (orderDate.toDateString() !== today.toDateString()) return false;
                        break;
                    case 'yesterday':
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        if (orderDate.toDateString() !== yesterday.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        if (orderDate < weekAgo) return false;
                        break;
                    case 'month':
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        if (orderDate < monthAgo) return false;
                        break;
                }
                
                // Custom date range
                if (customFrom && customTo) {
                    const fromDate = new Date(customFrom);
                    const toDate = new Date(customTo);
                    if (orderDate < fromDate || orderDate > toDate) return false;
                }
            }
            
            return true;
        });
        
        this.renderOrders();
    }
    
    renderOrders() {
        const tbody = document.getElementById('ordersTableBody');
        const emptyState = document.getElementById('ordersEmpty');
        const loadingState = document.getElementById('ordersLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredOrders.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        tbody.innerHTML = this.filteredOrders.map(order => `
            <tr>
                <td>
                    <strong>#${order.id}</strong>
                    ${order.channel ? `<div class="channel-badge">${order.channel}</div>` : ''}
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customerName}</div>
                        ${order.customerEmail ? `<div class="customer-email">${order.customerEmail}</div>` : ''}
                        ${order.customerPhone ? `<div class="customer-phone">${order.customerPhone}</div>` : ''}
                        ${order.customerAddress ? `<div class="customer-address">${order.customerAddress}</div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span class="item-name">${item.name}</span>
                                <span class="item-quantity">x${item.quantity || 1}</span>
                                <span class="item-price">$${item.price}</span>
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td>
                    <div class="price-display">
                        <div class="subtotal">$${(order.subtotal || 0).toFixed(2)}</div>
                        ${order.deliveryCharge ? `<div class="delivery-charge">+$${order.deliveryCharge.toFixed(2)}</div>` : ''}
                        <div class="total">$${order.total.toFixed(2)}</div>
                    </div>
                </td>
                <td>
                    <span class="status-pill ${order.status}">
                        ${order.status.replace('_', ' ').toUpperCase()}
                    </span>
                </td>
                <td>
                    ${new Date(order.date || order.createdAt).toLocaleDateString()}
                </td>
                <td>
                    <div class="product-actions">
                        <button class="quick-action-btn edit" onclick="orderManager.viewOrderDetails('${order.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="quick-action-btn update" onclick="orderManager.updateOrderStatus('${order.id}')" title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    updateOrderSummary() {
        const totalOrders = document.getElementById('totalOrders');
        const pendingOrders = document.getElementById('pendingOrders');
        
        if (totalOrders) totalOrders.textContent = this.orders.length;
        if (pendingOrders) pendingOrders.textContent = this.orders.filter(o => o.status === 'pending').length;
    }
    
    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const modal = document.getElementById('orderModal');
        const detailsContent = document.getElementById('orderDetailsContent');
        
        // Render order details
        detailsContent.innerHTML = `
            <div class="order-details">
                <div class="detail-section">
                    <h4>Order Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Order ID:</span>
                        <span class="detail-value">#${order.orderId || order.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${new Date(order.date || order.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="status-pill ${order.status}">${order.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    ${order.channel ? `
                    <div class="detail-row">
                        <span class="detail-label">Channel:</span>
                        <span class="detail-value">${order.channel.toUpperCase()}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <h4>Customer Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${order.customerName}</span>
                    </div>
                    ${order.customerPhone ? `
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${order.customerPhone}</span>
                    </div>
                    ` : ''}
                    ${order.customerAddress ? `
                    <div class="detail-row">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value">${order.customerAddress}</span>
                    </div>
                    ` : ''}
                    ${order.customerEmail ? `
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${order.customerEmail}</span>
                    </div>
                    ` : ''}
                    ${order.notes ? `
                    <div class="detail-row">
                        <span class="detail-label">Notes:</span>
                        <span class="detail-value">${order.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <h4>Order Items</h4>
                    <div class="order-items-list">
                        ${order.items.map(item => `
                            <div class="order-item-detail">
                                <div class="item-header">
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-price">$${item.price}</span>
                                </div>
                                <div class="item-details">
                                    <span class="item-quantity">Quantity: ${item.quantity || 1}</span>
                                    ${item.selectedSize ? `<span class="item-size">Size: ${item.selectedSize}</span>` : ''}
                                    ${item.color ? `<span class="item-color">Color: ${item.color}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Order Totals</h4>
                    <div class="detail-row">
                        <span class="detail-label">Subtotal:</span>
                        <span class="detail-value">$${(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    ${order.deliveryCharge ? `
                    <div class="detail-row">
                        <span class="detail-label">Delivery Charge:</span>
                        <span class="detail-value">$${order.deliveryCharge.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row total-row">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value total-value">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'flex';
    }
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${order.customer}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${order.email}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Order Items</h4>
                    <div class="order-items-detail">
                        ${order.items.map(item => `
                            <div class="order-item-detail">
                                <div class="item-info">
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-quantity">Quantity: ${item.quantity}</span>
                                    <span class="item-price">$${item.price}</span>
                                </div>
                                <div class="item-total">$${(item.quantity * item.price).toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Order Summary</h4>
                    <div class="detail-row">
                        <span class="detail-label">Subtotal:</span>
                        <span class="detail-value">$${order.total.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value price-display">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
                
                ${order.notes ? `
                    <div class="detail-section">
                        <h4>Notes</h4>
                        <div class="detail-value">${order.notes}</div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Show modal
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeOrderModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('orderModal').style.display = 'none';
        }, 300);
    }
    
    async updateOrderStatus() {
        // Get the selected order
        const order = this.orders.find(o => o.id === this.currentEditingOrderId);
        if (!order) {
            this.showToast('Order not found', 'error');
            return;
        }
        
        // Ask for new status
        const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        const currentStatusIndex = statusOptions.indexOf(order.status);
        const newStatusIndex = (currentStatusIndex + 1) % statusOptions.length;
        const newStatus = statusOptions[newStatusIndex];
        
        if (!confirm(`Change order status from "${order.status}" to "${newStatus}"?`)) {
            return;
        }
        
        try {
            // Update in Firebase
            if (window.firebaseDB) {
                const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                
                // Use the original order structure to update
                const originalOrder = order.raw;
                
                if (originalOrder && originalOrder.customer && typeof originalOrder.customer === 'object') {
                    // Website-style order - update nested structure
                    await update(ref(window.firebaseDB, `orders/${order.id}`), {
                        status: newStatus,
                        updatedAt: Date.now()
                    });
                } else {
                    // Legacy admin-style order - update flat structure
                    await update(ref(window.firebaseDB, `orders/${order.id}`), {
                        status: newStatus,
                        updatedAt: Date.now()
                    });
                }
                
                // Update local data
                order.status = newStatus;
                order.updatedAt = Date.now();
                
                // Re-render orders
                this.renderOrders();
                
                // Close modal
                this.closeOrderModal();
                
                this.showToast(`Order status updated to ${newStatus}`, 'success');
            }
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            this.showToast('Failed to update order status', 'error');
        }
    }
    
    exportOrders() {
        try {
            const csvContent = [
                ['Order ID', 'Customer Name', 'Phone', 'Email', 'Total', 'Status', 'Date'],
                ...this.filteredOrders.map(order => [
                    order.id,
                    order.customerName || '',
                    order.customerPhone || '',
                    order.customerEmail || '',
                    order.total.toFixed(2),
                    order.status,
                    new Date(order.date || order.createdAt).toLocaleDateString()
                ])
            ].map(row => row.join(',')).join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Orders exported successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error exporting orders:', error);
            this.showToast('Failed to export orders', 'error');
        }
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard) {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// ===================================
// INITIALIZATION
// ===================================

// Initialize managers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryManager = new InventoryManager();
    window.orderManager = new OrderManager();
    
    console.log('🎉 Inventory and Order Management Systems ready');
});
