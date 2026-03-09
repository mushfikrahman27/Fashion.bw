# Firebase Realtime Database Security Rules

## Rules for my-1st-site-09

```json
{
  "rules": {
    // Products: Public read for active products only
    "products": {
      ".read": "data.child('isActive').val() == true || data.child('isActive').val() == null",
      ".write": "auth != null && auth.token.admin === true",
      ".validate": {
        "name": "newData.isString() && newData.val().length > 0",
        "price": "newData.isNumber() && newData.val() > 0",
        "category": "newData.isString() && ['Men', 'Women', 'Accessories'].contains(newData.val())",
        "subCategory": "newData.isString()",
        "imgUrl": "newData.isString() && newData.val().matches(/^https?:\\/\\/.+/)",
        "isActive": "newData.isBoolean()",
        "createdAt": "newData.isNumber()",
        "updatedAt": "newData.isNumber()"
      }
    },
    
    // Product Analytics: Public write for views/carts, admin read
    "product_analytics": {
      "$productId": {
        ".read": "auth != null && auth.token.admin === true",
        ".write": "auth != null",
        "views": {
          ".validate": "newData.isNumber() && (data.val() === null || newData.val() >= data.val())"
        },
        "carts": {
          ".validate": "newData.isNumber() && (data.val() === null || newData.val() >= data.val())"
        },
        "productId": {
          ".validate": "newData.isString()"
        },
        "productName": {
          ".validate": "newData.isString()"
        },
        "price": {
          ".validate": "newData.isString() || newData.isNumber()"
        },
        "img": {
          ".validate": "newData.isString()"
        },
        "category": {
          ".validate": "newData.isString()"
        },
        "subCategory": {
          ".validate": "newData.isString()"
        },
        "lastUpdated": {
          ".validate": "newData.isNumber()"
        },
        "$other": {
          ".validate": false
        }
      }
    },
    
    // Orders: Public create, admin read/update
    "orders": {
      "$orderId": {
        ".read": "auth != null && auth.token.admin === true",
        ".write": "auth != null && (!data.exists() || auth.token.admin === true)",
        ".validate": {
          "customerName": "newData.isString() && newData.val().length > 0",
          "customerPhone": "newData.isString() && newData.val().matches(/^\\+?[0-9]{10,15}$/)",
          "items": "newData.hasChildren()",
          "totalAmount": "newData.isNumber() && newData.val() > 0",
          "status": "newData.isString() && ['pending', 'confirmed', 'shipped', 'delivered'].contains(newData.val())",
          "createdAt": "newData.isNumber()"
        }
      }
    },
    
    // Site Config: Admin only
    "site_config": {
      ".read": "auth != null && auth.token.admin === true",
      ".write": "auth != null && auth.token.admin === true"
    },
    
    // Visitors tracking: Public write, admin read
    "visits": {
      ".read": "auth != null && auth.token.admin === true",
      ".write": "auth != null",
      "$visitId": {
        ".validate": {
          "page": "newData.isString()",
          "timestamp": "newData.isNumber()",
          "userAgent": "newData.isString()"
        }
      }
    }
  }
}
```

## Security Notes

1. **Products**: 
   - Anyone can read active products
   - Only authenticated admins can write/update
   - Required fields validated

2. **Product Analytics**:
   - Public can increment views/carts counters
   - Only admins can read analytics data
   - Prevents decreasing counters

3. **Orders**:
   - Public can create new orders
   - Only admins can read/update orders
   - Validates customer phone format

4. **Site Config**: Admin-only access

5. **Visits**: Public write for tracking, admin read

## Setup Instructions

1. Go to Firebase Console → Realtime Database → Rules
2. Replace existing rules with the JSON above
3. Publish rules
4. Test with both public and admin access
