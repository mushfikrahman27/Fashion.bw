// admin/js/inventory-analytics.js - PHASE 3: Inventory Control & Search Demand Analytics
import { db } from '../../firebase-config.js';
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- 1. SEARCH INSIGHTS ENGINE ---
function syncSearchInsights() {
    const searchRef = ref(db, 'search_queries');
    onValue(searchRef, (snapshot) => {
        const listUI = document.getElementById('search-insights-list');
        if (!snapshot.exists()) {
            listUI.innerHTML = "<p style='color:#666; font-size:0.8rem;'>No search data yet.</p>";
            return;
        }

        const data = snapshot.val();
        // Sort by search count descending
        const sorted = Object.entries(data).sort((a,b) => b[1].count - a[1].count).slice(0, 5);

        listUI.innerHTML = sorted.map(([key, val]) => `
            <div class="insight-item">
                <span>"${val.query}"</span>
                <span class="search-count">${val.count} hits</span>
            </div>
        `).join('');
    });
}

// --- 2. PRODUCT INVENTORY SYNC ---
function syncProductInventory() {
    const productsRef = ref(db, 'products');
    const productGrid = document.getElementById('product-grid');
    
    onValue(productsRef, (snapshot) => {
        if (!snapshot.exists()) {
            productGrid.innerHTML = "<p style='text-align:center; color:#666;'>No products found.</p>";
            return;
        }

        const data = snapshot.val();
        productGrid.innerHTML = ""; // Clear loader

        Object.entries(data).forEach(([id, product]) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-item';
            
            const stockLevel = product.stock || 0;
            const stockStatus = stockLevel === 0 ? 'OUT OF STOCK' : 
                              stockLevel < 5 ? 'LOW STOCK' : 'IN STOCK';
            
            productCard.innerHTML = `
                <div style="position: relative;">
                    <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}" class="product-img">
                    <button class="btn-edit-float" onclick="editProduct('${id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <div class="product-info">
                    <div style="font-weight: 600; margin-bottom: 5px;">${product.name}</div>
                    <div style="color: #888; font-size: 0.8rem; margin-bottom: 8px;">TK ${product.price}</div>
                    <span class="stock-tag">${stockStatus}</span>
                    <div style="font-size: 0.75rem; color: #666; margin-top: 5px;">Stock: ${stockLevel}</div>
                </div>
            `;
            productGrid.appendChild(productCard);
        });
    });
}

// --- 3. QUICK STOCK UPDATE ---
window.updateStock = (productId, newStock) => {
    const pRef = ref(db, `products/${productId}`);
    update(pRef, { stock: newStock })
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
        feedback.textContent = "Stock updated successfully!";
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 3000);
    })
    .catch(err => alert("Error updating stock"));
};

// --- 4. QUICK EDIT PRODUCT ---
window.editProduct = (productId) => {
    // Simple inline edit for mobile
    const newStock = prompt("Enter new stock quantity:");
    if (newStock !== null && !isNaN(newStock)) {
        updateStock(productId, parseInt(newStock));
    }
};

// Start listeners
window.onload = () => {
    syncSearchInsights();
    syncProductInventory();
};
