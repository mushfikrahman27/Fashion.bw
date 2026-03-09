# Firebase Products Migration Guide

## Overview
This migration moves your hardcoded products in `script.js` to Firebase Realtime Database for business-ready product management.

## Data Model

### Product Structure (`/products/{productId}`)
```json
{
  "id": "unique_product_id",
  "name": "Product Name",
  "price": 1500,
  "color": "Black",
  "category": "Men",
  "subCategory": "Sneakers",
  "imgUrl": "https://example.com/image.jpg",
  "isActive": true,
  "createdAt": 1640995200000,
  "updatedAt": 1640995200000
}
```

### Required Fields
- **name**: String - Product display name
- **price**: Number - Price in BDT (no currency symbol)
- **category**: String - "Men", "Women", or "Accessories" 
- **subCategory**: String - Subcategory (e.g., "Sneakers", "Bags")
- **imgUrl**: String - Full URL to product image
- **isActive**: Boolean - Controls visibility (true = visible, false = hidden)
- **createdAt**: Number - Unix timestamp
- **updatedAt**: Number - Unix timestamp

### Optional Fields
- **color**: String - Product color variant

## Migration Steps

### 1. Apply Firebase Security Rules
Copy rules from `firebase-rules.md` to your Firebase Console → Realtime Database → Rules.

### 2. Populate Products in Firebase

#### Option A: Manual Firebase Console Entry
1. Go to Firebase Console → Realtime Database
2. Navigate to `/products`
3. Add each product with the structure above
4. Set `isActive: true` for visible products

#### Option B: Import from Script
Run this helper script in browser console to auto-populate:

```javascript
// Paste in browser console on your site
async function importProductsToFirebase() {
    const { ref, set, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
    
    // Your existing products from script.js
    const products = [
        {
            id: "luxury_tote_bag_1",
            name: "Luxury Tote Bag",
            price: 750,
            color: "Black",
            category: "Women",
            subCategory: "Bags",
            imgUrl: "images/tote-bag.jpeg",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        },
        // ... add all other products
    ];
    
    const productsRef = ref(window.firebaseDB, 'products');
    
    for (const product of products) {
        await set(ref(productsRef, product.id), product);
        console.log(`Imported: ${product.name}`);
    }
    
    console.log('Products imported successfully!');
}

// Run import
importProductsToFirebase();
```

### 3. Verify Migration
1. Clear browser cache
2. Reload your site
3. Check browser console for "Loaded X products from Firebase"
4. Verify products display correctly
5. Test search, filtering, and cart functionality

### 4. Test Fallback
1. Temporarily disable Firebase in `firebase-config.js`
2. Reload site
3. Should show "Using fallback hardcoded products" in console
4. Products should still display using hardcoded array

## Testing Checklist

- [ ] Firebase products load on page refresh
- [ ] Active/inactive toggle works (set `isActive: false` to test)
- [ ] Search works with Firebase products
- [ ] Category filtering works
- [ ] Cart functionality preserved
- [ ] Fallback works when Firebase unavailable
- [ ] Product analytics still track
- [ ] Admin can read/write products (after Commit 2)

## Rollback Plan

If issues occur:
1. Remove Firebase loader code from `script.js` (lines 239-290)
2. Restore original `const allProducts = [...]` declaration
3. Site will work with hardcoded products immediately

## Next Steps

After testing Commit 1:
1. **Commit 2**: Admin product management UI
2. **Commit 3**: Order saving before WhatsApp redirect

## Notes

- Product IDs should be unique strings (not numbers)
- Use full URLs for `imgUrl` when possible
- `img` field supported for backward compatibility
- Size logic remains unchanged (generated from subCategory)
- All existing UI/UX preserved
