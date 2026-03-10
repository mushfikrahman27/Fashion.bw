/* --- PHASE 3 ADMIN POWER FEATURES --- */

// Global state for bulk operations
let selectedProducts = new Set();
let allProducts = [];
let bulkEditMode = {
    action: null,
    data: null
};

// Stock automation configuration
const STOCK_CONFIG = {
    LOW_STOCK_THRESHOLD: 5,
    OUT_OF_STOCK_THRESHOLD: 0,
    AUTO_DEDUCT_ENABLED: true
};

/* ========================================
   FIREBASE COMPATIBILITY LAYER
   ======================================== */

// Firebase functions will be available through the main dashboard script
// These are fallback references for when Firebase is not yet loaded
function dbRef(db, path) {
    return window.dbRef ? window.dbRef(db, path) : { path };
}

function get(ref) {
    return window.dbGet ? window.dbGet(ref) : Promise.resolve({ val: () => ({}) });
}

function update(ref, data) {
    return window.dbUpdate ? window.dbUpdate(ref, data) : Promise.resolve();
}

function remove(ref) {
    return window.dbRemove ? window.dbRemove(ref) : Promise.resolve();
}

/* ========================================
   1. BULK PRODUCT EDIT FUNCTIONALITY
   ======================================== */

/**
 * Initialize bulk edit functionality
 */
function initializeBulkEdit() {
    setupBulkEventListeners();
    addProductCheckboxes();
    setupBulkActionBar();
}

/**
 * Add checkboxes to all product rows
 */
function addProductCheckboxes() {
    // This would be called when products are loaded
    const productRows = document.querySelectorAll('.product-row, .admin-table tr[data-product-id]');
    
    productRows.forEach(row => {
        const productId = row.dataset.productId;
        if (productId && !row.querySelector('.product-checkbox')) {
            const checkbox = createProductCheckbox(productId);
            const firstCell = row.querySelector('td:first-child, th:first-child');
            if (firstCell) {
                firstCell.style.position = 'relative';
                firstCell.insertBefore(checkbox, firstCell.firstChild);
            }
        }
    });
}

/**
 * Create product checkbox element
 */
function createProductCheckbox(productId) {
    const checkbox = document.createElement('div');
    checkbox.className = 'product-checkbox';
    checkbox.dataset.productId = productId;
    checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleProductSelection(productId, checkbox);
    };
    return checkbox;
}

/**
 * Toggle product selection
 */
function toggleProductSelection(productId, checkboxElement) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
        checkboxElement.classList.remove('checked');
    } else {
        selectedProducts.add(productId);
        checkboxElement.classList.add('checked');
    }
    
    updateBulkActionBar();
}

/**
 * Setup bulk action bar event listeners
 */
function setupBulkActionBar() {
    const actionBar = document.getElementById('bulkActionBar');
    const actionType = document.getElementById('bulkActionType');
    const applyBtn = document.getElementById('bulkApplyBtn');
    const clearBtn = document.getElementById('bulkClearBtn');
    
    if (!actionBar) return;
    
    // Action type change
    actionType?.addEventListener('change', (e) => {
        bulkEditMode.action = e.target.value;
        applyBtn.disabled = !e.target.value || selectedProducts.size === 0;
    });
    
    // Apply button
    applyBtn?.addEventListener('click', () => {
        if (bulkEditMode.action && selectedProducts.size > 0) {
            openBulkEditModal();
        }
    });
    
    // Clear button
    clearBtn?.addEventListener('click', clearBulkSelection);
}

/**
 * Update bulk action bar visibility and state
 */
function updateBulkActionBar() {
    const actionBar = document.getElementById('bulkActionBar');
    const selectedCount = document.getElementById('bulkSelectedCount');
    const applyBtn = document.getElementById('bulkApplyBtn');
    
    if (!actionBar) return;
    
    if (selectedProducts.size > 0) {
        actionBar.classList.add('active');
        selectedCount.textContent = `${selectedProducts.size} selected`;
        applyBtn.disabled = !bulkEditMode.action;
    } else {
        actionBar.classList.remove('active');
        clearBulkSelection();
    }
}

/**
 * Clear bulk selection
 */
function clearBulkSelection() {
    selectedProducts.clear();
    document.querySelectorAll('.product-checkbox.checked').forEach(cb => {
        cb.classList.remove('checked');
    });
    
    const actionType = document.getElementById('bulkActionType');
    const applyBtn = document.getElementById('bulkApplyBtn');
    
    if (actionType) actionType.value = '';
    if (applyBtn) applyBtn.disabled = true;
    
    bulkEditMode = { action: null, data: null };
    updateBulkActionBar();
}

/**
 * Open bulk edit modal
 */
function openBulkEditModal() {
    const modal = document.getElementById('bulkEditModal');
    const form = document.getElementById('bulkEditForm');
    const subtitle = document.getElementById('bulkEditSubtitle');
    
    if (!modal || !form) return;
    
    // Update subtitle
    subtitle.textContent = `${selectedProducts.size} products will be updated`;
    
    // Generate form based on action type
    form.innerHTML = generateBulkEditForm(bulkEditMode.action);
    
    // Setup form event listeners
    setupBulkEditForm();
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Generate bulk edit form HTML based on action type
 */
function generateBulkEditForm(actionType) {
    const forms = {
        category: `
            <div class="form-group">
                <label class="form-label">New Category</label>
                <select class="form-select" id="bulkCategory" required>
                    <option value="">Select category...</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Accessories">Accessories</option>
                </select>
            </div>
        `,
        status: `
            <div class="form-group">
                <label class="form-label">New Status</label>
                <select class="form-select" id="bulkStatus" required>
                    <option value="">Select status...</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>
            </div>
        `,
        price: `
            <div class="form-group">
                <label class="form-label">Price Adjustment Type</label>
                <select class="form-select" id="priceAdjustmentType" required>
                    <option value="set">Set Fixed Price</option>
                    <option value="increase_amount">Increase by Amount</option>
                    <option value="decrease_amount">Decrease by Amount</option>
                    <option value="increase_percent">Increase by Percentage</option>
                    <option value="decrease_percent">Decrease by Percentage</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Amount</label>
                <input type="number" class="form-input" id="priceAmount" min="0" step="0.01" required>
            </div>
        `,
        stock: `
            <div class="form-group">
                <label class="form-label">Stock Adjustment Type</label>
                <select class="form-select" id="stockAdjustmentType" required>
                    <option value="set">Set Stock Quantity</option>
                    <option value="add">Add Stock</option>
                    <option value="subtract">Subtract Stock</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" class="form-input" id="stockQuantity" min="0" required>
            </div>
        `,
        delete: `
            <div class="form-group">
                <label class="form-label">Action Type</label>
                <select class="form-select" id="deleteActionType" required>
                    <option value="archive">Archive Products</option>
                    <option value="delete">Delete Permanently</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Confirmation</label>
                <input type="text" class="form-input" id="deleteConfirmation" 
                       placeholder="Type 'DELETE' to confirm" required>
            </div>
        `
    };
    
    return forms[actionType] || '<p>Invalid action type</p>';
}

/**
 * Setup bulk edit form event listeners
 */
function setupBulkEditForm() {
    const confirmBtn = document.getElementById('bulkEditConfirm');
    const cancelBtn = document.getElementById('bulkEditCancel');
    
    confirmBtn?.addEventListener('click', executeBulkEdit);
    cancelBtn?.addEventListener('click', closeBulkEditModal);
}

/**
 * Execute bulk edit operation
 */
async function executeBulkEdit() {
    const modal = document.getElementById('bulkEditModal');
    const confirmBtn = document.getElementById('bulkEditConfirm');
    
    if (!modal) return;
    
    // Disable button during operation
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
    
    try {
        // Collect form data
        const editData = collectBulkEditData();
        
        // Validate data
        if (!validateBulkEditData(editData)) {
            throw new Error('Invalid form data');
        }
        
        // Execute bulk update
        const results = await performBulkUpdate(editData);
        
        // Show results
        showBulkEditResults(results);
        
        // Close modal and clear selection
        closeBulkEditModal();
        clearBulkSelection();
        
        // Refresh product list
        if (typeof refreshProductList === 'function') {
            refreshProductList();
        }
        
    } catch (error) {
        console.error('Bulk edit failed:', error);
        showToast('Bulk edit failed: ' + error.message, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Apply Changes';
    }
}

/**
 * Collect bulk edit data from form
 */
function collectBulkEditData() {
    const data = {
        action: bulkEditMode.action,
        productIds: Array.from(selectedProducts),
        values: {}
    };
    
    switch (bulkEditMode.action) {
        case 'category':
            data.values.category = document.getElementById('bulkCategory')?.value;
            break;
        case 'status':
            data.values.status = document.getElementById('bulkStatus')?.value;
            break;
        case 'price':
            data.values.adjustmentType = document.getElementById('priceAdjustmentType')?.value;
            data.values.amount = parseFloat(document.getElementById('priceAmount')?.value) || 0;
            break;
        case 'stock':
            data.values.adjustmentType = document.getElementById('stockAdjustmentType')?.value;
            data.values.quantity = parseInt(document.getElementById('stockQuantity')?.value) || 0;
            break;
        case 'delete':
            data.values.actionType = document.getElementById('deleteActionType')?.value;
            data.values.confirmation = document.getElementById('deleteConfirmation')?.value;
            break;
    }
    
    return data;
}

/**
 * Validate bulk edit data
 */
function validateBulkEditData(data) {
    if (!data.action || !data.productIds.length) {
        return false;
    }
    
    switch (data.action) {
        case 'category':
            return !!data.values.category;
        case 'status':
            return !!data.values.status;
        case 'price':
            return !!data.values.adjustmentType && data.values.amount >= 0;
        case 'stock':
            return !!data.values.adjustmentType && data.values.quantity >= 0;
        case 'delete':
            return !!data.values.actionType && data.values.confirmation === 'DELETE';
        default:
            return false;
    }
}

/**
 * Perform bulk update operation
 */
async function performBulkUpdate(data) {
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const productId of data.productIds) {
        try {
            await updateSingleProduct(productId, data);
            results.success++;
        } catch (error) {
            results.failed++;
            results.errors.push(`Product ${productId}: ${error.message}`);
        }
    }
    
    return results;
}

/**
 * Update single product
 */
async function updateSingleProduct(productId, data) {
    // Use the database reference from the main dashboard
    const db = window.firebaseDB;
    if (!db) {
        throw new Error('Database not available');
    }
    
    const productRef = dbRef(db, `products/${productId}`);
    const snapshot = await get(productRef);
    
    if (!snapshot.exists()) {
        throw new Error('Product not found');
    }
    
    const product = snapshot.val();
    let updates = {};
    
    switch (data.action) {
        case 'category':
            updates.category = data.values.category;
            break;
        case 'status':
            updates.status = data.values.status;
            break;
        case 'price':
            const currentPrice = parseFloat(product.price) || 0;
            switch (data.values.adjustmentType) {
                case 'set':
                    updates.price = data.values.amount;
                    break;
                case 'increase_amount':
                    updates.price = currentPrice + data.values.amount;
                    break;
                case 'decrease_amount':
                    updates.price = Math.max(0, currentPrice - data.values.amount);
                    break;
                case 'increase_percent':
                    updates.price = currentPrice * (1 + data.values.amount / 100);
                    break;
                case 'decrease_percent':
                    updates.price = Math.max(0, currentPrice * (1 - data.values.amount / 100));
                    break;
            }
            break;
        case 'stock':
            const currentStock = parseInt(product.stock) || 0;
            switch (data.values.adjustmentType) {
                case 'set':
                    updates.stock = data.values.quantity;
                    break;
                case 'add':
                    updates.stock = currentStock + data.values.quantity;
                    break;
                case 'subtract':
                    updates.stock = Math.max(0, currentStock - data.values.quantity);
                    break;
            }
            // Auto-update stock status
            updates.stockStatus = calculateStockStatus(updates.stock);
            break;
        case 'delete':
            if (data.values.actionType === 'archive') {
                updates.archived = true;
                updates.status = 'inactive';
            } else {
                await remove(productRef);
                return; // Don't update if deleted
            }
            break;
    }
    
    updates.updatedAt = Date.now();
    updates.updatedBy = 'admin_bulk_edit';
    
    await update(productRef, updates);
}

/**
 * Close bulk edit modal
 */
function closeBulkEditModal() {
    const modal = document.getElementById('bulkEditModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Show bulk edit results
 */
function showBulkEditResults(results) {
    const message = results.failed === 0 
        ? `Successfully updated ${results.success} products`
        : `Updated ${results.success} products, ${results.failed} failed`;
    
    const type = results.failed === 0 ? 'success' : 'warning';
    showToast(message, type);
    
    if (results.errors.length > 0) {
        console.error('Bulk edit errors:', results.errors);
    }
}

/* ========================================
   2. STOCK AUTOMATION FUNCTIONALITY
   ======================================== */

/**
 * Initialize stock automation
 */
function initializeStockAutomation() {
    setupStockListeners();
    updateAllStockStatuses();
}

/**
 * Setup stock change listeners
 */
function setupStockListeners() {
    // Listen for order changes to auto-deduct stock
    const ordersRef = dbRef(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const orders = snapshot.val() || {};
        processOrderStockDeduction(orders);
    });
    
    // Listen for product changes to update status
    const productsRef = dbRef(db, 'products');
    onValue(productsRef, (snapshot) => {
        const products = snapshot.val() || {};
        updateProductStockStatuses(products);
    });
}

/**
 * Calculate stock status based on quantity
 */
function calculateStockStatus(stock) {
    const quantity = parseInt(stock) || 0;
    
    if (quantity <= STOCK_CONFIG.OUT_OF_STOCK_THRESHOLD) {
        return 'out_of_stock';
    } else if (quantity <= STOCK_CONFIG.LOW_STOCK_THRESHOLD) {
        return 'low_stock';
    } else {
        return 'in_stock';
    }
}

/**
 * Update all product stock statuses
 */
function updateAllStockStatuses() {
    const productsRef = dbRef(db, 'products');
    get(productsRef).then((snapshot) => {
        const products = snapshot.val() || {};
        updateProductStockStatuses(products);
    });
}

/**
 * Update product stock statuses
 */
function updateProductStockStatuses(products) {
    const updates = {};
    
    Object.entries(products).forEach(([productId, product]) => {
        const currentStatus = product.stockStatus;
        const newStatus = calculateStockStatus(product.stock);
        
        if (currentStatus !== newStatus) {
            updates[`products/${productId}/stockStatus`] = newStatus;
            updates[`products/${productId}/stockUpdatedAt`] = Date.now();
        }
    });
    
    if (Object.keys(updates).length > 0) {
        update(dbRef(db), updates);
    }
}

/**
 * Process order stock deduction
 */
function processOrderStockDeduction(orders) {
    if (!STOCK_CONFIG.AUTO_DEDUCT_ENABLED) return;
    
    Object.values(orders).forEach(order => {
        if (order.status === 'confirmed' && !order.stockDeducted) {
            deductOrderStock(order);
        }
    });
}

/**
 * Deduct stock for a single order
 */
async function deductOrderStock(order) {
    const updates = {};
    let hasErrors = false;
    
    if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
            try {
                const productRef = dbRef(db, `products/${item.productId}`);
                const snapshot = await get(productRef);
                
                if (snapshot.exists()) {
                    const product = snapshot.val();
                    const currentStock = parseInt(product.stock) || 0;
                    const quantity = parseInt(item.quantity) || 1;
                    
                    if (currentStock >= quantity) {
                        const newStock = currentStock - quantity;
                        const newStatus = calculateStockStatus(newStock);
                        
                        updates[`products/${item.productId}/stock`] = newStock;
                        updates[`products/${item.productId}/stockStatus`] = newStatus;
                        updates[`products/${item.productId}/stockUpdatedAt`] = Date.now();
                    } else {
                        console.warn(`Insufficient stock for product ${item.productId}`);
                        hasErrors = true;
                    }
                }
            } catch (error) {
                console.error(`Error deducting stock for product ${item.productId}:`, error);
                hasErrors = true;
            }
        }
    }
    
    // Mark order as stock deducted
    updates[`orders/${order.id}/stockDeducted`] = true;
    updates[`orders/${order.id}/stockDeductedAt`] = Date.now();
    
    if (hasErrors) {
        updates[`orders/${order.id}/stockDeductionErrors`] = true;
    }
    
    await update(dbRef(db), updates);
}

/**
 * Get stock status badge HTML
 */
function getStockStatusBadge(status) {
    const badges = {
        in_stock: '<span class="stock-badge in-stock">In Stock</span>',
        low_stock: '<span class="stock-badge low-stock">Low Stock</span>',
        out_of_stock: '<span class="stock-badge out-of-stock">Out of Stock</span>'
    };
    
    return badges[status] || badges.in_stock;
}

/* ========================================
   3. ANALYTICS DASHBOARD ENHANCEMENT
   ======================================== */

/**
 * Initialize enhanced analytics
 */
function initializeEnhancedAnalytics() {
    loadEnhancedMetrics();
    setupAnalyticsRefresh();
}

/**
 * Load enhanced analytics metrics
 */
function loadEnhancedMetrics() {
    Promise.all([
        loadOrdersAnalytics(),
        loadProductsAnalytics(),
        loadRevenueAnalytics(),
        loadStockAnalytics()
    ]).then(() => {
        hideSkeletons();
        renderEnhancedDashboard();
    }).catch(error => {
        console.error('Error loading analytics:', error);
        hideSkeletons();
    });
}

/**
 * Load orders analytics
 */
async function loadOrdersAnalytics() {
    const ordersRef = dbRef(db, 'orders');
    const snapshot = await get(ordersRef);
    const orders = snapshot.val() || {};
    
    const ordersArray = Object.values(orders);
    const totalOrders = ordersArray.length;
    
    // Calculate trend (simplified - last 7 days vs previous 7 days)
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    const recentOrders = ordersArray.filter(o => (o.timestamp || 0) >= weekAgo);
    const previousOrders = ordersArray.filter(o => {
        const ts = o.timestamp || 0;
        return ts >= twoWeeksAgo && ts < weekAgo;
    });
    
    const trend = previousOrders.length > 0 
        ? Math.round(((recentOrders.length - previousOrders.length) / previousOrders.length) * 100)
        : 0;
    
    // Update UI
    updateElement('totalOrders', totalOrders);
    updateElement('ordersTrend', `${trend >= 0 ? '+' : ''}${trend}%`);
    
    return { totalOrders, recentOrders, trend };
}

/**
 * Load revenue analytics
 */
async function loadRevenueAnalytics() {
    const ordersRef = dbRef(db, 'orders');
    const snapshot = await get(ordersRef);
    const orders = snapshot.val() || {};
    
    let totalRevenue = 0;
    const ordersArray = Object.values(orders);
    
    ordersArray.forEach(order => {
        if (order.total) {
            totalRevenue += parseFloat(order.total) || 0;
        } else if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const price = parseFloat(item.price) || 0;
                const quantity = parseInt(item.quantity) || 1;
                totalRevenue += price * quantity;
            });
        }
    });
    
    // Update UI
    updateElement('totalRevenue', `৳${totalRevenue.toLocaleString()}`);
    
    // Calculate trend (simplified)
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    let recentRevenue = 0;
    let previousRevenue = 0;
    
    ordersArray.forEach(order => {
        const orderRevenue = order.total || 0;
        const ts = order.timestamp || 0;
        
        if (ts >= weekAgo) {
            recentRevenue += orderRevenue;
        } else if (ts >= twoWeeksAgo && ts < weekAgo) {
            previousRevenue += orderRevenue;
        }
    });
    
    const trend = previousRevenue > 0 
        ? Math.round(((recentRevenue - previousRevenue) / previousRevenue) * 100)
        : 0;
    
    updateElement('revenueTrend', `${trend >= 0 ? '+' : ''}${trend}%`);
    
    return { totalRevenue, trend };
}

/**
 * Load products analytics
 */
async function loadProductsAnalytics() {
    const productsRef = dbRef(db, 'products');
    const ordersRef = dbRef(db, 'orders');
    
    const [productsSnapshot, ordersSnapshot] = await Promise.all([
        get(productsRef),
        get(ordersRef)
    ]);
    
    const products = productsSnapshot.val() || {};
    const orders = ordersSnapshot.val() || {};
    
    // Calculate top products
    const productSales = {};
    
    Object.values(orders).forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const productId = item.productId;
                if (productId) {
                    productSales[productId] = (productSales[productId] || 0) + (item.quantity || 1);
                }
            });
        }
    });
    
    // Sort and get top products
    const topProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([productId, sales]) => {
            const product = products[productId];
            return {
                id: productId,
                name: product?.name || 'Unknown Product',
                sales,
                price: product?.price || 0
            };
        });
    
    // Render top products
    renderTopProducts(topProducts);
    
    // Update top product card
    if (topProducts.length > 0) {
        updateElement('topProductName', topProducts[0].name);
        updateElement('topProductSales', `${topProducts[0].sales} sales`);
    }
    
    return { topProducts };
}

/**
 * Load stock analytics
 */
async function loadStockAnalytics() {
    const productsRef = dbRef(db, 'products');
    const snapshot = await get(productsRef);
    const products = snapshot.val() || {};
    
    const lowStockProducts = [];
    
    Object.entries(products).forEach(([productId, product]) => {
        const stock = parseInt(product.stock) || 0;
        const status = calculateStockStatus(stock);
        
        if (status === 'low_stock' || status === 'out_of_stock') {
            lowStockProducts.push({
                id: productId,
                name: product.name || 'Unknown Product',
                stock,
                status
            });
        }
    });
    
    // Update low stock count
    updateElement('lowStockCount', lowStockProducts.length);
    
    // Render low stock alerts
    renderLowStockAlerts(lowStockProducts);
    
    return { lowStockProducts };
}

/**
 * Render top products list
 */
function renderTopProducts(topProducts) {
    const container = document.getElementById('topProductsList');
    const countElement = document.getElementById('topProductsCount');
    
    if (!container) return;
    
    countElement.textContent = topProducts.length;
    
    if (topProducts.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No sales data available</p>';
        return;
    }
    
    container.innerHTML = topProducts.map((product, index) => `
        <div class="top-product-item">
            <div class="top-product-rank">${index + 1}</div>
            <div class="top-product-info">
                <div class="top-product-name">${product.name}</div>
                <div class="top-product-meta">৳${product.price}</div>
            </div>
            <div class="top-product-value">${product.sales} sold</div>
        </div>
    `).join('');
}

/**
 * Render low stock alerts
 */
function renderLowStockAlerts(lowStockProducts) {
    const container = document.getElementById('lowStockList');
    const countElement = document.getElementById('lowStockAlertCount');
    
    if (!container) return;
    
    countElement.textContent = lowStockProducts.length;
    
    if (lowStockProducts.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">All products well stocked</p>';
        return;
    }
    
    container.innerHTML = lowStockProducts.map(product => `
        <div class="low-stock-item">
            <div class="low-stock-info">
                <div class="low-stock-name">${product.name}</div>
                <div class="low-stock-quantity">${product.stock} units remaining</div>
            </div>
            ${getStockStatusBadge(product.status)}
        </div>
    `).join('');
}

/**
 * Render recent orders summary
 */
function renderRecentOrders() {
    const ordersRef = dbRef(db, 'orders');
    get(ordersRef).then(snapshot => {
        const orders = snapshot.val() || {};
        const ordersArray = Object.values(orders);
        
        // Sort by timestamp (newest first) and get recent 5
        const recentOrders = ordersArray
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 5)
            .map(order => ({
                id: order.orderId || order.id,
                customer: order.customer?.name || 'Unknown',
                status: order.status || 'pending',
                total: order.total || 0
            }));
        
        const container = document.getElementById('recentOrdersList');
        const countElement = document.getElementById('recentOrdersCount');
        
        if (!container) return;
        
        countElement.textContent = recentOrders.length;
        
        if (recentOrders.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No recent orders</p>';
            return;
        }
        
        container.innerHTML = recentOrders.map(order => `
            <div class="recent-order-item">
                <div class="recent-order-info">
                    <div class="recent-order-id">${order.id}</div>
                    <div class="recent-order-customer">${order.customer}</div>
                </div>
                <div style="text-align:right;">
                    <div class="recent-order-status status-${order.status}">${order.status}</div>
                    <div style="font-size:0.875rem; font-weight:600; color:var(--text-main);">৳${order.total}</div>
                </div>
            </div>
        `).join('');
    });
}

/**
 * Render enhanced dashboard
 */
function renderEnhancedDashboard() {
    renderRecentOrders();
    
    // Update performance chart if needed
    if (typeof updatePerformanceChart === 'function') {
        updatePerformanceChart();
    }
}

/**
 * Setup analytics refresh
 */
function setupAnalyticsRefresh() {
    // Refresh analytics every 5 minutes
    setInterval(() => {
        loadEnhancedMetrics();
    }, 5 * 60 * 1000);
}

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

/**
 * Update element content safely
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // This would integrate with existing toast system
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast element if it doesn't exist
    const container = document.getElementById('toastContainer');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

/**
 * Hide skeleton loaders
 */
function hideSkeletons() {
    document.querySelectorAll('.skeleton-list, .skeleton').forEach(el => {
        el.style.display = 'none';
    });
}

/* ========================================
   INITIALIZATION
   ======================================== */

/**
 * Initialize all Phase 3 features
 */
function initializePhase3Features() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePhase3Features);
        return;
    }
    
    console.log('🚀 Initializing Phase 3 Admin Power Features...');
    
    // Initialize each feature
    initializeBulkEdit();
    initializeStockAutomation();
    initializeEnhancedAnalytics();
    
    console.log('✅ Phase 3 Features Initialized');
}

// Auto-initialize when script loads
initializePhase3Features();

// Make functions globally available
window.bulkEditPhase3 = {
    initializeBulkEdit,
    clearBulkSelection,
    openBulkEditModal,
    closeBulkEditModal
};

window.stockAutomationPhase3 = {
    initializeStockAutomation,
    calculateStockStatus,
    getStockStatusBadge
};

window.analyticsPhase3 = {
    initializeEnhancedAnalytics,
    loadEnhancedMetrics,
    renderEnhancedDashboard
};
