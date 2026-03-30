// ============================================
// GLOBAL CLEANUP MANAGER
// utils/cleanup-manager.js
// ============================================

const _listeners = new Map();
const _firestoreUnsubs = new Map();

export function registerListener(sectionId, element, event, handler) {
    if (!_listeners.has(sectionId)) _listeners.set(sectionId, []);
    element.addEventListener(event, handler);
    _listeners.get(sectionId).push({ element, event, handler });
}

export function registerFirestoreListener(sectionId, unsubFn) {
    if (!_firestoreUnsubs.has(sectionId)) _firestoreUnsubs.set(sectionId, []);
    _firestoreUnsubs.get(sectionId).push(unsubFn);
}

export function cleanupSection(sectionId) {
    // Remove DOM event listeners
    (_listeners.get(sectionId) || []).forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    _listeners.delete(sectionId);

    // Unsubscribe all Firestore onSnapshot listeners
    (_firestoreUnsubs.get(sectionId) || []).forEach(unsub => unsub());
    _firestoreUnsubs.delete(sectionId);
}

export function getActiveListeners() {
    return {
        listeners: Array.from(_listeners.keys()),
        totalListeners: Array.from(_listeners.values()).flat().length
    };
}

export function getActiveSubscriptions() {
    return {
        subscriptions: Array.from(_firestoreUnsubs.keys()),
        totalSubscriptions: Array.from(_firestoreUnsubs.values()).flat().length
    };
}
