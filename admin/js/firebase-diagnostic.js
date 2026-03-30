// ============================================
// FIREBASE DATA DIAGNOSTIC TOOL
// js/firebase-diagnostic.js
// ============================================

class FirebaseDiagnostic {
    constructor() {
        this.db = null;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        console.log('🔍 Starting Firebase Diagnostic...');
        
        if (!window.firebaseDB) {
            console.error('❌ Firebase not initialized');
            return;
        }
        
        this.db = window.firebaseDB;
        await this.checkAllCollections();
    }

    // ─────────────────────────────────────────
    // CHECK ALL COLLECTIONS
    // ─────────────────────────────────────────
    async checkAllCollections() {
        const collections = ['orders', 'products', 'users', 'inventory'];
        
        for (const collectionName of collections) {
            await this.checkCollection(collectionName);
        }
        
        // Show summary
        this.showDiagnosticSummary();
    }

    // ─────────────────────────────────────────
    // CHECK SINGLE COLLECTION
    // ─────────────────────────────────────────
    async checkCollection(collectionName) {
        try {
            console.log(`📋 Checking collection: ${collectionName}`);
            
            const collectionRef = this.db.collection(collectionName);
            const snapshot = await collectionRef.get();
            
            if (snapshot.empty) {
                console.log(`⚠️ Collection '${collectionName}' is EMPTY`);
                this.showCollectionStatus(collectionName, 'empty', 0);
            } else {
                const docs = snapshot.docs;
                console.log(`✅ Collection '${collectionName}' has ${docs.length} documents`);
                
                // Show first few documents as examples
                const examples = docs.slice(0, 3).map(doc => ({
                    id: doc.id,
                    data: doc.data()
                }));
                
                this.showCollectionStatus(collectionName, 'has_data', docs.length, examples);
            }
            
        } catch (error) {
            console.error(`❌ Error checking collection '${collectionName}':`, error);
            this.showCollectionStatus(collectionName, 'error', 0, null, error.message);
        }
    }

    // ─────────────────────────────────────────
    // SHOW COLLECTION STATUS
    // ─────────────────────────────────────────
    showCollectionStatus(collectionName, status, count, examples = null, error = null) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'diagnostic-item';
        statusDiv.innerHTML = `
            <div class="diagnostic-header">
                <strong>${collectionName.toUpperCase()}</strong>
                <span class="status-badge status-${status}">${this.getStatusText(status)}</span>
            </div>
            <div class="diagnostic-details">
                ${this.getStatusDetails(status, count, examples, error)}
            </div>
        `;
        
        document.body.appendChild(statusDiv);
    }

    // ─────────────────────────────────────────
    // GET STATUS TEXT
    // ─────────────────────────────────────────
    getStatusText(status) {
        const statusMap = {
            'has_data': 'HAS DATA',
            'empty': 'EMPTY',
            'error': 'ERROR'
        };
        return statusMap[status] || 'UNKNOWN';
    }

    // ─────────────────────────────────────────
    // GET STATUS DETAILS
    // ─────────────────────────────────────────
    getStatusDetails(status, count, examples, error) {
        switch (status) {
            case 'has_data':
                return `
                    <div class="count">Documents: ${count}</div>
                    <div class="examples">
                        <strong>Sample Documents:</strong>
                        ${examples.map(ex => this.formatExample(ex)).join('')}
                    </div>
                `;
            case 'empty':
                return `
                    <div class="count">Documents: 0</div>
                    <div class="message">Collection exists but has no documents</div>
                `;
            case 'error':
                return `
                    <div class="error-message">Error: ${error}</div>
                `;
            default:
                return `<div class="message">Unknown status</div>`;
        }
    }

    // ─────────────────────────────────────────
    // FORMAT EXAMPLE
    // ─────────────────────────────────────────
    formatExample(example) {
        return `
            <div class="example">
                <strong>ID:</strong> ${example.id}<br>
                <strong>Data:</strong> <pre>${JSON.stringify(example.data, null, 2)}</pre>
            </div>
        `;
    }

    // ─────────────────────────────────────────
    // SHOW DIAGNOSTIC SUMMARY
    // ─────────────────────────────────────────
    showDiagnosticSummary() {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'diagnostic-summary';
        summaryDiv.innerHTML = `
            <h3>🔍 Firebase Diagnostic Summary</h3>
            <p>This diagnostic shows what's actually in your Firebase Firestore database.</p>
            <div class="actions">
                <button onclick="window.firebaseDiagnostic.createTestData()" class="btn btn-primary">
                    📝 Create Test Data
                </button>
                <button onclick="window.firebaseDiagnostic.clearDiagnostic()" class="btn btn-secondary">
                    🗑️ Clear Diagnostic
                </button>
            </div>
            <div class="instructions">
                <strong>If collections are empty:</strong><br>
                1. Add data via your website frontend<br>
                2. Or create test data using the button above<br>
                3. Refresh the admin panel to see real data
            </div>
        `;
        
        document.body.appendChild(summaryDiv);
    }

    // ─────────────────────────────────────────
    // CREATE TEST DATA
    // ─────────────────────────────────────────
    async createTestData() {
        console.log('📝 Creating test data...');
        
        const testData = {
            orders: [
                {
                    customerName: 'Test Customer 1',
                    customerEmail: 'test1@example.com',
                    total: 99.99,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                },
                {
                    customerName: 'Test Customer 2',
                    customerEmail: 'test2@example.com',
                    total: 199.99,
                    status: 'processing',
                    createdAt: new Date().toISOString()
                }
            ],
            products: [
                {
                    name: 'Test Product 1',
                    price: 29.99,
                    stock: 50,
                    active: true,
                    status: 'Active',
                    createdAt: new Date().toISOString()
                },
                {
                    name: 'Test Product 2',
                    price: 49.99,
                    stock: 25,
                    active: true,
                    status: 'Active',
                    createdAt: new Date().toISOString()
                }
            ],
            users: [
                {
                    name: 'Test User 1',
                    email: 'user1@example.com',
                    isActive: true,
                    role: 'customer',
                    createdAt: new Date().toISOString()
                }
            ]
        };

        try {
            for (const [collectionName, documents] of Object.entries(testData)) {
                const collectionRef = this.db.collection(collectionName);
                for (const doc of documents) {
                    await collectionRef.add(doc);
                    console.log(`✅ Added test document to ${collectionName}`);
                }
            }
            
            alert('✅ Test data created successfully! Refresh the admin panel to see real data.');
            location.reload();
            
        } catch (error) {
            console.error('❌ Error creating test data:', error);
            alert('❌ Error creating test data: ' + error.message);
        }
    }

    // ─────────────────────────────────────────
    // CLEAR DIAGNOSTIC
    // ─────────────────────────────────────────
    clearDiagnostic() {
        const diagnosticElements = document.querySelectorAll('.diagnostic-item, .diagnostic-summary');
        diagnosticElements.forEach(el => el.remove());
    }
}

// Initialize diagnostic
window.firebaseDiagnostic = new FirebaseDiagnostic();

// Auto-run when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseDB) {
        window.firebaseDiagnostic.init();
    }
});
