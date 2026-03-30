// ============================================
// QUICK PRODUCTS DEBUG
// js/quick-products-debug.js
// ============================================

console.log('🔍 Starting Quick Products Debug...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting debug...');
    
    // Wait a bit for Firebase
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔥 Firebase Status:');
    console.log('  window.firebaseDB:', window.firebaseDB);
    console.log('  window.firebaseDB.collection:', typeof window.firebaseDB?.collection);
    
    console.log('📦 Products Status:');
    console.log('  window.allProducts:', window.allProducts);
    console.log('  window.allProducts.length:', window.allProducts?.length);
    
    console.log('🎯 Product Grid:');
    const grid = document.getElementById('productGrid');
    console.log('  grid element:', grid);
    console.log('  grid children:', grid?.children?.length);
    
    // Try to force load products
    if (window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
        console.log('✅ Firebase ready, trying to load products...');
        try {
            const productsRef = window.firebaseDB.collection('products');
            const snapshot = await productsRef.get();
            console.log('📊 Firestore query result:');
            console.log('  snapshot.empty:', snapshot.empty);
            console.log('  snapshot.docs:', snapshot.docs.length);
            
            if (!snapshot.empty) {
                const products = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('🛍️ Products found:', products.length);
                console.log('  First product:', products[0]);
                
                // Force update window.allProducts
                window.allProducts = products;
                
                // Try to render
                if (window.updateProductView) {
                    console.log('🎨 Calling updateProductView...');
                    window.updateProductView();
                } else {
                    console.error('❌ updateProductView function not found');
                }
            } else {
                console.log('⚠️ No products in Firestore collection');
            }
        } catch (error) {
            console.error('❌ Error loading products:', error);
        }
    } else {
        console.error('❌ Firebase not ready or collection method not available');
    }
    
    // Show debug panel
    setTimeout(() => {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'quick-debug-panel';
        debugPanel.innerHTML = `
            <div style="position: fixed; top: 10px; left: 10px; background: white; border: 2px solid #333; padding: 10px; z-index: 99999; font-family: monospace; font-size: 12px; max-width: 300px;">
                <h4>🔍 Products Debug</h4>
                <p>Firebase: ${window.firebaseDB ? '✅' : '❌'}</p>
                <p>Collection: ${typeof window.firebaseDB?.collection === 'function' ? '✅' : '❌'}</p>
                <p>Products: ${window.allProducts?.length || 0}</p>
                <p>Grid Items: ${document.getElementById('productGrid')?.children?.length || 0}</p>
                <button onclick="this.parentElement.remove()" style="margin-top: 10px;">Close</button>
            </div>
        `;
        document.body.appendChild(debugPanel);
    }, 3000);
});
