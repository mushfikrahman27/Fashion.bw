// ============================================
// AUDIT LOGGING SYSTEM
// utils/audit-log.js
// ============================================

import { getCollectionRef } from '../firebase-paths.js';

class AuditLogger {
    constructor() {
        this.batchSize = 100;
        this.logQueue = [];
        this.isProcessing = false;
    }

    // ─────────────────────────────────────────
    // LOG ADMIN ACTION
    // ─────────────────────────────────────────
    async logAction(action, details = {}) {
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
            console.warn('Cannot log audit: No authenticated user');
            return;
        }

        const logEntry = {
            action: action,                    // e.g. "PRODUCT_DELETED", "ORDER_STATUS_CHANGED"
            details: details,                  // object with relevant data
            adminUID: window.firebaseAuth.currentUser.uid,
            adminEmail: window.firebaseAuth.currentUser.email,
            timestamp: new Date(),
            ipHint: navigator.userAgent,
            sessionId: this.getSessionId(),
            pageUrl: window.location.href
        };

        // Add to queue for batch processing
        this.logQueue.push(logEntry);

        // Process batch if queue is full or process immediately for critical actions
        const criticalActions = ['USER_LOGIN', 'USER_LOGOUT', 'SECURITY_BREACH', 'DATA_EXPORT'];
        if (this.logQueue.length >= this.batchSize || criticalActions.includes(action)) {
            await this.processBatch();
        } else {
            // Schedule batch processing for non-critical actions
            this.scheduleBatchProcessing();
        }
    }

    // ─────────────────────────────────────────
    // PROCESS BATCH
    // ─────────────────────────────────────────
    async processBatch() {
        if (this.isProcessing || this.logQueue.length === 0) return;

        this.isProcessing = true;
        const batch = this.logQueue.splice(0, this.batchSize);

        try {
            const collectionRef = getCollectionRef('AUDIT_LOGS');
            
            // Add all logs in batch
            const promises = batch.map(logEntry => 
                collectionRef.add(logEntry)
            );
            
            await Promise.all(promises);
            
            console.log(`Audit batch processed: ${batch.length} entries`);
            
        } catch (error) {
            console.error('Audit log batch error:', error);
            // Re-add failed entries to queue
            this.logQueue.unshift(...batch);
        } finally {
            this.isProcessing = false;
        }
    }

    // ─────────────────────────────────────────
    // SCHEDULE BATCH PROCESSING
    // ─────────────────────────────────────────
    scheduleBatchProcessing() {
        if (this.batchTimer) return;
        
        this.batchTimer = setTimeout(() => {
            this.processBatch();
            this.batchTimer = null;
        }, 5000); // Process every 5 seconds
    }

    // ─────────────────────────────────────────
    // GET SESSION ID
    // ─────────────────────────────────────────
    getSessionId() {
        let sessionId = sessionStorage.getItem('adminSessionId');
        
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
            sessionStorage.setItem('adminSessionId', sessionId);
        }
        
        return sessionId;
    }

    // ─────────────────────────────────────────
    // SPECIFIC LOGGING METHODS
    // ─────────────────────────────────────────
    async logProductAction(action, productData) {
        await this.logAction('PRODUCT_' + action, {
            productId: productData.id,
            productName: productData.name,
            category: productData.category,
            price: productData.price,
            changes: productData.changes
        });
    }

    async logOrderAction(action, orderData) {
        await this.logAction('ORDER_' + action, {
            orderId: orderData.id,
            customerId: orderData.customerId,
            total: orderData.total,
            status: orderData.status,
            previousStatus: orderData.previousStatus
        });
    }

    async logInventoryAction(action, inventoryData) {
        await this.logAction('INVENTORY_' + action, {
            productId: inventoryData.productId,
            oldStock: inventoryData.oldStock,
            newStock: inventoryData.newStock,
            change: inventoryData.change
        });
    }

    async logUserAction(action, userData) {
        await this.logAction('USER_' + action, {
            targetUserId: userData.id,
            targetEmail: userData.email,
            reason: userData.reason
        });
    }

    async logSecurityEvent(action, securityData) {
        await this.logAction('SECURITY_' + action, {
            severity: securityData.severity || 'MEDIUM',
            description: securityData.description,
            source: securityData.source,
            blocked: securityData.blocked
        });
    }

    async logSystemAction(action, systemData) {
        await this.logAction('SYSTEM_' + action, {
            component: systemData.component,
            operation: systemData.operation,
            result: systemData.result,
            duration: systemData.duration
        });
    }

    // ─────────────────────────────────────────
    // GET RECENT LOGS
    // ─────────────────────────────────────────
    async getRecentLogs(limit = 50) {
        try {
            const collectionRef = getCollectionRef('AUDIT_LOGS');
            const snapshot = await collectionRef
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get recent logs error:', error);
            return [];
        }
    }

    // ─────────────────────────────────────────
    // SEARCH LOGS
    // ─────────────────────────────────────────
    async searchLogs(filters = {}) {
        try {
            const collectionRef = getCollectionRef('AUDIT_LOGS');
            let query = collectionRef.orderBy('timestamp', 'desc');
            
            // Apply filters
            if (filters.action) {
                query = query.where('action', '==', filters.action);
            }
            
            if (filters.adminUID) {
                query = query.where('adminUID', '==', filters.adminUID);
            }
            
            if (filters.startDate) {
                query = query.where('timestamp', '>=', new Date(filters.startDate));
            }
            
            if (filters.endDate) {
                query = query.where('timestamp', '<=', new Date(filters.endDate));
            }
            
            const snapshot = await query.limit(filters.limit || 100).get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Search logs error:', error);
            return [];
        }
    }

    // ─────────────────────────────────────────
    // EXPORT LOGS
    // ─────────────────────────────────────────
    async exportLogs(filters = {}) {
        const logs = await this.searchLogs(filters);
        
        const csvContent = this.convertToCSV(logs);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Log the export action
        await this.logAction('LOGS_EXPORTED', {
            filters: filters,
            recordCount: logs.length
        });
    }

    // ─────────────────────────────────────────
    // CONVERT TO CSV
    // ─────────────────────────────────────────
    convertToCSV(logs) {
        const headers = [
            'Timestamp', 'Action', 'Admin Email', 'Details', 'Session ID', 'IP Hint'
        ];
        
        const rows = logs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.action,
            log.adminEmail,
            JSON.stringify(log.details),
            log.sessionId,
            log.ipHint
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }

    // ─────────────────────────────────────────
    // CLEANUP OLD LOGS
    // ─────────────────────────────────────────
    async cleanupOldLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const collectionRef = getCollectionRef('AUDIT_LOGS');
            const snapshot = await collectionRef
                .where('timestamp', '<', cutoffDate)
                .get();
            
            // Delete old logs in batches
            const batch = window.firebaseDB.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            console.log(`Cleaned up ${snapshot.size} old audit logs`);
            
        } catch (error) {
            console.error('Cleanup logs error:', error);
        }
    }
}

// Initialize audit logger
window.auditLogger = new AuditLogger();

// Auto-process any remaining logs on page load
document.addEventListener('DOMContentLoaded', () => {
    // Process any queued logs
    setTimeout(() => {
        window.auditLogger.processBatch();
    }, 1000);
    
    // Schedule cleanup daily
    setInterval(() => {
        window.auditLogger.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Daily
});

// Export functions for global use
export async function logAction(action, details) {
    await window.auditLogger.logAction(action, details);
}

export async function logProductAction(action, productData) {
    await window.auditLogger.logProductAction(action, productData);
}

export async function logOrderAction(action, orderData) {
    await window.auditLogger.logOrderAction(action, orderData);
}

export async function logInventoryAction(action, inventoryData) {
    await window.auditLogger.logInventoryAction(action, inventoryData);
}

export async function logUserAction(action, userData) {
    await window.auditLogger.logUserAction(action, userData);
}

export async function logSecurityEvent(action, securityData) {
    await window.auditLogger.logSecurityEvent(action, securityData);
}

export async function logSystemAction(action, systemData) {
    await window.auditLogger.logSystemAction(action, systemData);
}
