// MIGRATE FALLBACK PRODUCTS TO FIREBASE
// Safe one-time migration script
// Run this in browser console on admin dashboard

(async function migrateFallbackProducts() {
    console.log('🔄 STARTING SAFE MIGRATION...');
    
    try {
        // Import Firebase modules
        const { ref, get, set, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        const { db } = await import('./firebase-config.js');
        
        // Fallback products from script.js (normalized)
        const fallbackProducts = [
            // WOMEN CATEGORY
            { id: 1, name: "Luxury Tote Bag", price: "750", color: "Black", img: "bag1.jpg", category: "Women", subCategory: "Bags", image: "images/tote-bag.jpeg" },
            { id: 2, name: "Premium Handbag", price: "950", color: "Brown", img: "bag2.jpg", category: "Women", subCategory: "Bags", image: "images/pic-2.jpg" },
            { id: 6, name: "Elegant Shoulder Bag", price: "820", color: "Beige", img: "bag3.jpg", category: "Women", subCategory: "Bags", image: "images/pic-3.jpg" },
            { id: 7, name: "Mini Party Clutch", price: "640", color: "Gold", img: "bag4.jpg", category: "Women", subCategory: "Bags", image: "images/pic-4.jpg" },
            { id: 8, name: "Casual Canvas Bag", price: "520", color: "Cream", img: "bag5.jpg", category: "Women", subCategory: "Bags", image: "images/pic-5.jpeg" },
            { id: 9, name: "Premium Abaya", price: "1400", color: "Pink", img: "dress1.jpg", category: "Women", subCategory: "Most Viewed", image: "images/pic-6.jpg" },
            { id: 10, name: "premium borkha", price: "2600", color: "Maroon", img: "dress2.jpg", category: "Women", subCategory: "Dress", image: "images/pic-7.jpg" },
            { id: 11, name: "Casual Women Watch", price: "980", color: "Sky Blue", img: "dress3.jpg", category: "Women", subCategory: "Trending", image: "images/pic-8.webp" },
            { id: 28, name: "Women Fashion Sandal", price: "1450", color: "Beige", img: "sandal1.jpg", category: "Women", subCategory: "Shoes", image: "images/pic-20.jpg" },
            { id: 29, name: "Elegant Heel Sandal", price: "1750", color: "Black", img: "sandal2.jpg", category: "Women", subCategory: "Shoes", image: "images/pic-20.jpg" },
            { id: 34, name: "Women Knit Sweater", price: "1680", color: "Cream", img: "sweater1.jpg", category: "Women", subCategory: "Sweater", image: "sweater1.jpg" },
            { id: 35, name: "Soft Wool Cardigan", price: "1780", color: "Lavender", img: "sweater2.jpg", category: "Women", subCategory: "Sweater", image: "sweater2.jpg" },
            { id: 39, name: "Luxury Party Purse", price: "1450", color: "Rose Gold", img: "bag9.jpg", category: "Women", subCategory: "Bags", image: "bag9.jpg" },
            { id: 42, name: "Women Basic Tee", price: "760", color: "Peach", img: "tshirt3.jpg", category: "Women", subCategory: "Tshirt", image: "tshirt3.jpg" },
            { id: 43, name: "Oversized Street Tee", price: "990", color: "Grey", img: "tshirt4.jpg", category: "Women", subCategory: "Tshirt", image: "tshirt4.jpg" },
            { id: 46, name: "Yoga Leggings", price: "1100", color: "Black", img: "legging1.jpg", category: "Women", subCategory: "Leggings", image: "legging1.jpg" },
            { id: 47, name: "Active Sports Leggings", price: "1250", color: "Purple", img: "legging2.jpg", category: "Women", subCategory: "Leggings", image: "legging2.jpg" },

            // MEN CATEGORY
            { id: 3, name: "Urban Street Sneaker", price: "1800", color: "White/Grey", img: "sneaker1.jpg", category: "Men", subCategory: "Sneakers", image: "images/pic-9.webp" },
            { id: 4, name: "Classic Sport Sneaker", price: "2200", color: "Blue", img: "sneaker2.jpg", category: "Men", subCategory: "Sneakers", image: "images/pic-10.jpg" },
            { id: 12, name: "Running Pro Sneaker", price: "1950", color: "Black/Red", img: "sneaker3.jpg", category: "Men", subCategory: "Sneakers", image: "images/pic-11.jpg" },
            { id: 13, name: "Minimal White Sneaker", price: "1750", color: "White", img: "sneaker4.jpg", category: "Men", subCategory: "Sneakers", image: "images/pic-12.webp" },
            { id: 14, name: "Formal Leather Shoe", price: "2600", color: "Dark Brown", img: "shoe1.jpg", category: "Men", subCategory: "Shoes", image: "images/pic-13.jpg" },
            { id: 15, name: "Office Classic Shoe", price: "2400", color: "Black", img: "shoe2.jpg", category: "Men", subCategory: "Shoes", image: "images/pic-14.jpg" },
            { id: 16, name: "Slim Fit Shirt", price: "1200", color: "White", img: "shirt1.jpg", category: "Men", subCategory: "Shirt", image: "images/pic-15.webp" },
            { id: 17, name: "Casual Check Shirt", price: "980", color: "Green", img: "shirt2.jpg", category: "Men", subCategory: "Shirt", image: "images/pic-15.webp" },
            { id: 18, name: "Denim Casual Shirt", price: "1450", color: "Blue", img: "shirt3.jpg", category: "Men", subCategory: "Shirt", image: "images/pic-15.webp" },
            { id: 5, name: "Dark Aviator", price: "1200", color: "Silver", img: "glass1.jpg", category: "Men", subCategory: "Sunglasses", image: "images/pic-16.webp" },
            { id: 19, name: "Retro Round Glass", price: "1350", color: "Black", img: "glass2.jpg", category: "Men", subCategory: "Sunglasses", image: "images/pic-16.webp" },
            { id: 20, name: "Luxury Gold Frame", price: "1650", color: "Gold", img: "glass3.jpg", category: "Men", subCategory: "Sunglasses", image: "images/pic-16.webp" },
            { id: 26, name: "Travel Backpack", price: "2100", color: "Grey", img: "bag6.jpg", category: "Men", subCategory: "Bags", image: "images/pic-19.jpg" },
            { id: 27, name: "Office Laptop Bag", price: "2350", color: "Black", img: "bag7.jpg", category: "Men", subCategory: "Bags", image: "images/pic-19.jpg" },
            { id: 32, name: "Winter Hoodie", price: "1850", color: "Charcoal", img: "hoodie1.jpg", category: "Men", subCategory: "Hoodie", image: "hoodie1.jpg" },
            { id: 33, name: "Casual Zip Hoodie", price: "1950", color: "Olive", img: "hoodie2.jpg", category: "Men", subCategory: "Hoodie", image: "hoodie2.jpg" },
            { id: 38, name: "Travel Duffel Bag", price: "2600", color: "Army Green", img: "bag8.jpg", category: "Men", subCategory: "Bags", image: "bag8.jpg" },
            { id: 40, name: "Classic Polo T-Shirt", price: "920", color: "White", img: "tshirt1.jpg", category: "Men", subCategory: "Tshirt", image: "tshirt1.jpg" },
            { id: 41, name: "Graphic Street Tee", price: "880", color: "Black", img: "tshirt2.jpg", category: "Men", subCategory: "Tshirt", image: "tshirt2.jpg" },
            { id: 44, name: "Running Shorts", price: "720", color: "Black", img: "short1.jpg", category: "Men", subCategory: "Shorts", image: "short1.jpg" },
            { id: 45, name: "Casual Cotton Shorts", price: "680", color: "Khaki", img: "short2.jpg", category: "Men", subCategory: "Shorts", image: "short2.jpg" },

            // COLLECTION CATEGORY
            { id: 21, name: "Smart Analog Watch", price: "3200", color: "Silver", img: "watch1.jpg", category: "Collection", subCategory: "Watches", image: "images/pic-17.png" },
            { id: 22, name: "Leather Strap Watch", price: "2850", color: "Brown", img: "watch2.jpg", category: "Collection", subCategory: "Watches", image: "images/pic-17.png" },
            { id: 23, name: "Modern Black Watch", price: "3100", color: "Black", img: "watch3.jpg", category: "Collection", subCategory: "Watches", image: "images/pic-17.png" },
            { id: 24, name: "Classic Leather Belt", price: "850", color: "Brown", img: "belt1.jpg", category: "Collection", subCategory: "Belts", image: "images/pic-18.jpg" },
            { id: 25, name: "Minimal Black Belt", price: "780", color: "Black", img: "belt2.jpg", category: "Collection", subCategory: "Belts", image: "images/pic-18.jpg" },
            { id: 30, name: "Sports Cap", price: "420", color: "Navy", img: "cap1.jpg", category: "Collection", subCategory: "Caps" },
            { id: 31, name: "Urban Snapback Cap", price: "520", color: "Black", img: "cap2.jpg", category: "Collection", subCategory: "Caps" },
            { id: 36, name: "Premium Wallet", price: "980", color: "Dark Brown", img: "wallet1.jpg", category: "Collection", subCategory: "Wallet", image: "wallet1.jpg" },
            { id: 37, name: "Compact Card Holder", price: "620", color: "Black", img: "wallet2.jpg", category: "Collection", subCategory: "Wallet", image: "wallet2.jpg" },
            { id: 48, name: "Winter Scarf", price: "520", color: "Maroon", img: "scarf1.jpg", category: "Collection", subCategory: "Winter", image: "scarf1.jpg" },
            { id: 49, name: "Knitted Gloves", price: "480", color: "Grey", img: "glove1.jpg", category: "Collection", subCategory: "Winter", image: "glove1.jpg" },
            { id: 50, name: "Premium Travel Suitcase", price: "5400", color: "Black", img: "case1.jpg", category: "Collection", subCategory: "Travel", image: "case1.jpg" }
        ];

        console.log(`📋 Found ${fallbackProducts.length} fallback products to migrate`);

        // STEP 1: Check existing Firebase products
        console.log('🔍 Checking existing Firebase products...');
        const productsRef = ref(db, 'products');
        const existingSnapshot = await get(productsRef);
        const existingProducts = existingSnapshot.val() || {};

        console.log(`📦 Found ${Object.keys(existingProducts).length} existing products in Firebase`);

        // STEP 2: Deduplication check
        const productsToMigrate = [];
        let skippedCount = 0;

        for (const fallbackProduct of fallbackProducts) {
            // Check for duplicates based on name + category + subCategory
            const isDuplicate = Object.values(existingProducts).some(existing => {
                return existing.name === fallbackProduct.name &&
                       existing.category === fallbackProduct.category &&
                       existing.subCategory === fallbackProduct.subCategory &&
                       existing.price === fallbackProduct.price;
            });

            if (isDuplicate) {
                console.log(`⚠️ Skipping duplicate: ${fallbackProduct.name} (${fallbackProduct.category}/${fallbackProduct.subCategory})`);
                skippedCount++;
            } else {
                productsToMigrate.push(fallbackProduct);
            }
        }

        console.log(`📊 Migration plan: ${productsToMigrate.length} to migrate, ${skippedCount} duplicates skipped`);

        // STEP 3: Migrate to Firebase with safe structure
        let migratedCount = 0;
        let errorCount = 0;

        for (const product of productsToMigrate) {
            try {
                // Create Firebase-compatible product structure
                const firebaseProduct = {
                    id: '', // Will be set by Firebase key
                    name: product.name,
                    price: product.price.toString(), // Ensure string format
                    img: product.image || product.img, // Use the better image field
                    category: product.category,
                    subCategory: product.subCategory,
                    color: product.color || 'Default',
                    size: product.size || 'One Size', // Safe default
                    stock: 10, // Safe default for all products
                    status: 'active', // All products start as active
                    description: `${product.name} - ${product.color} color`, // Safe description
                    createdAt: Date.now(), // Current timestamp
                    isActive: true // All products are active
                };

                // Create new product in Firebase
                const newProductRef = push(productsRef);
                const finalProductData = {
                    ...firebaseProduct,
                    id: newProductRef.key
                };

                await set(newProductRef, finalProductData);
                console.log(`✅ Migrated: ${product.name} (${product.category}/${product.subCategory})`);
                migratedCount++;

            } catch (error) {
                console.error(`❌ Failed to migrate ${product.name}:`, error);
                errorCount++;
            }
        }

        // STEP 4: Final verification
        console.log('\n🎉 MIGRATION SUMMARY:');
        console.log(`✅ Successfully migrated: ${migratedCount} products`);
        console.log(`❌ Failed migrations: ${errorCount} products`);
        console.log(`⚠️ Skipped duplicates: ${skippedCount} products`);
        console.log(`📊 Total processed: ${fallbackProducts.length} products`);

        // Verify final Firebase state
        const finalSnapshot = await get(productsRef);
        const finalCount = Object.keys(finalSnapshot.val() || {}).length;
        console.log(`🔍 Firebase now contains: ${finalCount} total products`);

        if (migratedCount > 0) {
            console.log('\n🔄 NEXT STEPS:');
            console.log('1. Refresh admin dashboard to see migrated products');
            console.log('2. Refresh main website to load from Firebase');
            console.log('3. Test filtering and search functionality');
            console.log('4. Verify all products appear correctly');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
})();
