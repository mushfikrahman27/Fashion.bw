// ============================================
// FIREBASE COLLECTION CONSTANTS
// Standardize all Firebase collection paths
// ============================================

const COLLECTIONS = {
  PRODUCTS: "products",
  ORDERS: "orders", 
  INVENTORY: "inventory",
  USERS: "users",
  CATEGORIES: "categories",
  MEDIA: "media",
  ANALYTICS: "analytics",
  SETTINGS: "settings",
  MESSAGES: "messages"
};

const SUBCOLLECTIONS = {
  STATUS_HISTORY: "statusHistory",
  ORDER_ITEMS: "items"
};

const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing", 
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled"
};

// Helper functions
function getCollectionRef(collectionName) {
  if (!window.firebaseDB) {
    console.error('Firebase not initialized');
    return null;
  }
  // Firestore uses collection() method
  return window.firebaseDB.collection(collectionName);
}

function getDocRef(collectionName, docId) {
  if (!window.firebaseDB) {
    console.error('Firebase not initialized');
    return null;
  }
  // Firestore uses collection().doc() method
  return window.firebaseDB.collection(collectionName).doc(docId);
}

// Firestore query helper
function getQuery(collectionRef, options = {}) {
  if (!window.firebaseDB) {
    console.error('Firebase not initialized');
    return null;
  }
  
  let query = collectionRef;
  
  if (options.where) {
    query = query.where(options.where[0], options.where[1], options.where[2]);
  }
  if (options.orderBy) {
    query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  return query;
}

// Make available globally
window.COLLECTIONS = COLLECTIONS;
window.SUBCOLLECTIONS = SUBCOLLECTIONS;
window.ORDER_STATUS = ORDER_STATUS;
window.getCollectionRef = getCollectionRef;
window.getDocRef = getDocRef;
window.getQuery = getQuery;

// Helper function to validate status transitions
function isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
        'pending': ['processing', 'cancelled'],
        'processing': ['shipped', 'cancelled'],
        'shipped': ['delivered'],
        'delivered': [], // End state
        'cancelled': [] // End state
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// Make available globally
window.isValidStatusTransition = isValidStatusTransition;
