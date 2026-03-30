# Firebase Security Rules - Inarah E-commerce

This file contains the production-ready Firebase Realtime Database and Storage security rules for the Inarah e-commerce application.

## Database Paths Used in Codebase

Based on code analysis, the following RTDB paths are actively used:

### Public Site (`script.js`)
- `/products` - Product catalog (public read, admin write)
- `/orders` - Customer orders (public create, admin read/update/delete)
- `/product_analytics` - Product view/cart analytics (public write, admin read)

### Admin Dashboard (`admin/js/dashboard.js`)
- `/orders` - Order management (admin operations)
- `/products` - Product management (admin operations)
- `/product_analytics` - Analytics dashboard (admin read)
- `/media` - Banner/slider configuration (public read, admin write)
- `/admins` - Admin role management (admin-only)
- `/visits` - Visitor tracking (public read, admin write)

## Realtime Database Rules

Copy and paste these rules into Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    
    "products": {
      ".read": "data.child('isActive').val() == true",
      ".write": "root.child('admins').child(auth.uid).val() === true",
      ".validate": "newData.hasChildren(['name', 'price', 'category', 'subCategory', 'imgUrl', 'isActive']) &&
        newData.child('name').isString() && newData.child('name').val().length <= 80 &&
        newData.child('price').isNumber() && newData.child('price').val() >= 0 &&
        newData.child('category').isString() && newData.child('category').val().length <= 40 &&
        newData.child('subCategory').isString() && newData.child('subCategory').val().length <= 40 &&
        newData.child('color').isString() && newData.child('color').val().length <= 30 &&
        newData.child('imgUrl').isString() && newData.child('imgUrl').val().length <= 500 &&
        newData.child('isActive').isBoolean()"
    },
    
    "orders": {
      "$orderId": {
        ".read": "root.child('admins').child(auth.uid).val() === true",
        ".create": "true",
        ".update": "root.child('admins').child(auth.uid).val() === true",
        ".delete": "root.child('admins').child(auth.uid).val() === true",
        ".validate": "newData.hasChildren(['orderId', 'createdAt', 'status', 'channel', 'customer', 'items', 'totals']) &&
          newData.child('orderId').isString() && newData.child('orderId').val().length <= 30 &&
          newData.child('createdAt').isNumber() &&
          newData.child('status').isString() && newData.child('status').val().matches(/^(pending|archived|cancelled|approved|processing|delivered)$/) &&
          newData.child('channel').isString() && newData.child('channel').val().matches(/^(whatsapp|messenger|direct)$/) &&
          newData.child('customer').hasChildren(['name', 'phone', 'address']) &&
          newData.child('customer').child('name').isString() && newData.child('customer').child('name').val().length >= 2 && newData.child('customer').child('name').val().length <= 60 &&
          newData.child('customer').child('phone').isString() && newData.child('customer').child('phone').val().length >= 10 && newData.child('customer').child('phone').val().length <= 20 &&
          newData.child('customer').child('address').isString() && newData.child('customer').child('address').val().length >= 6 && newData.child('customer').child('address').val().length <= 200 &&
          newData.child('items').isList() && newData.child('items').val().size() >= 1 && newData.child('items').val().size() <= 30 &&
          newData.child('totals').hasChildren(['subtotal', 'total']) &&
          newData.child('totals').child('subtotal').isNumber() && newData.child('totals').child('subtotal').val() >= 0 &&
          newData.child('totals').child('total').isNumber() && newData.child('totals').child('total').val() >= 0",
        
        "items": {
          "$itemIndex": {
            ".validate": "newData.hasChildren(['productId', 'name', 'price']) &&
              newData.child('productId').isString() && newData.child('productId').val().length <= 50 &&
              newData.child('name').isString() && newData.child('name').val().length >= 1 && newData.child('name').val().length <= 100 &&
              newData.child('price').isNumber() && newData.child('price').val() > 0 &&
              (!newData.hasChild('qty') || (newData.child('qty').isNumber() && newData.child('qty').val() >= 1 && newData.child('qty').val() <= 20)) &&
              (!newData.hasChild('selectedSize') || (newData.child('selectedSize').isString() && newData.child('selectedSize').val().length <= 10)) &&
              (!newData.hasChild('color') || (newData.child('color').isString() && newData.child('color').val().length <= 30))"
          }
        }
      }
    },
    
    "product_analytics": {
      "$productId": {
        ".read": "root.child('admins').child(auth.uid).val() === true",
        ".write": "true",
        ".validate": "newData.hasChildren(['productId', 'productName', 'views', 'carts']) &&
          newData.child('productId').isString() &&
          newData.child('productName').isString() && newData.child('productName').val().length <= 100 &&
          newData.child('views').isNumber() && newData.child('views').val() >= 0 &&
          newData.child('carts').isNumber() && newData.child('carts').val() >= 0"
      }
    },
    
    "media": {
      ".read": "true",
      ".write": "root.child('admins').child(auth.uid).val() === true",
      ".validate": "newData.hasChildren(['url', 'updatedAt']) &&
        newData.child('url').isString() && newData.child('url').val().length <= 1000 &&
        newData.child('updatedAt').isNumber()"
    },
    
    "admins": {
      "$uid": {
        ".read": "root.child('admins').child(auth.uid).val() === true",
        ".write": "root.child('admins').child(auth.uid).val() === true",
        ".validate": "newData.isBoolean()"
      }
    },
    
    "visits": {
      ".read": "true",
      ".write": "root.child('admins').child(auth.uid).val() === true",
      ".validate": "newData.isNumber() && newData.val() >= 0"
    }
  }
}
```

## Storage Security Rules

Copy and paste these rules into Firebase Console → Storage → Rules:

```json
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Media uploads (banners, sliders) - admin only
    match /media/{mediaId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
        root.child('admins').child(request.auth.uid).val() == true &&
        fileName.matches(/.*\.(jpeg|jpg|png|webp)$/);
    }
    
    // Product images - admin only
    match /products/{productId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
        root.child('admins').child(request.auth.uid).val() == true &&
        fileName.matches(/.*\.(jpeg|jpg|png|webp)$/);
    }
    
    // Deny all other uploads
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply These Rules

### For Realtime Database:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Realtime Database** → **Rules**
4. Replace existing rules with the JSON rules above
5. Click **Publish**

### For Storage:
1. In Firebase Console, navigate to **Storage** → **Rules**
2. Replace existing rules with the JSON rules above
3. Click **Publish**

## Admin Setup

Before applying rules, ensure you have at least one admin user:

1. Get the user's UID from Firebase Authentication
2. In Realtime Database, add: `/admins/{uid}: true`
3. This user will have full admin access

Example using Firebase Console Data tab:
```json
{
  "admins": {
    "firebase-user-uid-here": true
  }
}
```

## Post-Apply Test Checklist

After applying the rules, verify the following:

### ✅ Public Site Functionality
- [ ] Homepage loads and displays active products
- [ ] Product filtering and search works
- [ ] Add to Cart functions correctly
- [ ] Order creation succeeds (WhatsApp/Messenger redirect)
- [ ] Product analytics tracking works (views/carts)

### ✅ Public Restrictions
- [ ] Cannot read other customers' orders
- [ ] Cannot modify products or media
- [ ] Cannot access admin dashboard without auth
- [ ] Invalid order payloads are rejected

### ✅ Admin Dashboard Functionality
- [ ] Admin can view all orders
- [ ] Admin can update order status (archive/delete)
- [ ] Admin can upload media (banners/sliders)
- [ ] Admin can manage products (when implemented)
- [ ] Admin can view analytics

### ✅ Non-Admin Restrictions
- [ ] Non-admin authenticated users can view dashboard
- [ ] Non-admin users cannot modify any data
- [ ] Order action buttons are disabled for non-admins
- [ ] Media upload is disabled for non-admins
- [ ] "Not authorized" alerts appear for blocked actions

### ✅ Data Validation
- [ ] Invalid product data is rejected
- [ ] Orders with missing required fields are rejected
- [ ] Orders with invalid totals are rejected
- [ ] Non-image uploads to storage are rejected
- [ ] Oversized text fields are rejected

## Important Notes

1. **Order ID Generation**: The current system generates client-side order IDs. The rules validate format but don't enforce uniqueness.
2. **Analytics Security**: Product analytics can be written by anyone (for tracking) but only read by admins.
3. **Media Access**: All uploaded images are publicly readable (required for website display).
4. **Admin Management**: Add/remove admin UIDs manually in the `/admins` node.

## Troubleshooting

If issues occur after applying rules:

1. **Check Firebase Console logs** for permission denied errors
2. **Verify admin UIDs** are correctly set in `/admins`
3. **Test with a fresh browser** to ensure cached auth is cleared
4. **Check data validation** - ensure all required fields are present
5. **Review Storage rules** if image uploads fail

## Security Considerations

- These rules assume client-side validation is implemented (as in Phase 5 - Commit 7)
- Consider implementing server-side validation for production
- Monitor Firebase usage for unusual patterns
- Regularly review admin user list
- Keep Firebase SDK versions updated
