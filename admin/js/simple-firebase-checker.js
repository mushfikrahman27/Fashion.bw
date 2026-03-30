// ============================================
// SIMPLE FIREBASE CHECKER
// js/simple-firebase-checker.js
// ============================================

class SimpleFirebaseChecker {
    constructor() {
        this.db = null;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        console.log('🔍 Starting Simple Firebase Check...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Check all collections
        await this.checkAllCollections();
        
        // Show results
        this.showResults();
    }

    // ─────────────────────────────────────────
    // WAIT FOR FIREBASE
    // ─────────────────────────────────────────
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseDB && typeof window.firebaseDB.collection === 'function') {
                    console.log('✅ Firebase is ready for checking');
                    this.db = window.firebaseDB;
                    resolve();
                } else {
                    console.log('⏳ Waiting for Firebase...');
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // ─────────────────────────────────────────
    // CHECK ALL COLLECTIONS
    // ─────────────────────────────────────────
    async checkAllCollections() {
        const collections = ['orders', 'products', 'users', 'inventory'];
        
        this.results = {
            orders: { count: 0, sample: null, error: null },
            products: { count: 0, sample: null, error: null },
            users: { count: 0, sample: null, error: null },
            inventory: { count: 0, sample: null, error: null }
        };
        
        for (const collectionName of collections) {
            await this.checkCollection(collectionName);
        }
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
                this.results[collectionName].count = 0;
                this.results[collectionName].sample = null;
            } else {
                const docs = snapshot.docs;
                console.log(`✅ Collection '${collectionName}' has ${docs.length} documents`);
                
                // Get first document as sample
                const firstDoc = docs[0];
                this.results[collectionName].count = docs.length;
                this.results[collectionName].sample = {
                    id: firstDoc.id,
                    data: firstDoc.data()
                };
                
                console.log(`📄 Sample from ${collectionName}:`, this.results[collectionName].sample);
            }
            
        } catch (error) {
            console.error(`❌ Error checking collection '${collectionName}':`, error);
            this.results[collectionName].error = error.message;
        }
    }

    // ─────────────────────────────────────────
    // SHOW RESULTS
    // ─────────────────────────────────────────
    showResults() {
        console.log('\n📊 === FIREBASE CHECK RESULTS ===');
        
        let hasRealData = false;
        
        for (const [collectionName, result] of Object.entries(this.results)) {
            console.log(`\n📁 ${collectionName.toUpperCase()}:`);
            console.log(`   Count: ${result.count}`);
            console.log(`   Error: ${result.error || 'None'}`);
            
            if (result.sample) {
                console.log(`   Sample ID: ${result.sample.id}`);
                console.log(`   Sample Data:`, result.sample.data);
                hasRealData = true;
            } else if (result.count === 0 && !result.error) {
                console.log(`   Status: EMPTY (no documents found)`);
            }
        }
        
        console.log('\n🎯 === ANALYSIS ===');
        
        if (hasRealData) {
            console.log('✅ REAL DATA FOUND - Your admin panel should show this data!');
            console.log('💡 If you\'re still seeing sample data, there might be a timing issue.');
        } else {
            console.log('❌ NO REAL DATA FOUND - All collections are empty');
            console.log('💡 This means no orders have been placed on your website yet.');
            console.log('💡 Or your website is saving to a different Firebase project.');
        }
        
        // Show visual results
        this.showVisualResults();
    }

    // ─────────────────────────────────────────
    // SHOW VISUAL RESULTS
    // ─────────────────────────────────────────
    showVisualResults() {
        // Create results panel
        const resultsPanel = document.createElement('div');
        resultsPanel.id = 'firebase-results-panel';
        resultsPanel.innerHTML = `
            <div class="results-header">
                <h3>🔍 Firebase Data Check</h3>
                <button onclick="window.simpleFirebaseChecker.closePanel()" class="btn-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="results-body">
                ${this.generateResultsHTML()}
            </div>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('firebase-checker-styles')) {
            const style = document.createElement('style');
            style.id = 'firebase-checker-styles';
            style.textContent = `
                #firebase-results-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 2px solid var(--primary);
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border);
                }
                
                .results-header h3 {
                    margin: 0;
                    color: var(--text);
                }
                
                .btn-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: color 0.2s ease;
                }
                
                .btn-close:hover {
                    color: var(--text);
                }
                
                .collection-result {
                    margin-bottom: 16px;
                    padding: 12px;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--bg);
                }
                
                .collection-result.has-data {
                    border-color: var(--success);
                    background: rgba(76, 175, 80, 0.1);
                }
                
                .collection-result.empty {
                    border-color: var(--warning);
                    background: rgba(255, 193, 7, 0.1);
                }
                
                .collection-result.error {
                    border-color: var(--danger);
                    background: rgba(244, 67, 54, 0.1);
                }
                
                .collection-name {
                    font-weight: 600;
                    color: var(--text);
                    margin-bottom: 8px;
                }
                
                .collection-details {
                    font-size: 14px;
                    color: var(--text-muted);
                }
                
                .sample-data {
                    margin-top: 8px;
                    padding: 8px;
                    background: white;
                    border-radius: 4px;
                    font-size: 12px;
                    word-break: break-word;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(resultsPanel);
    }

    // ─────────────────────────────────────────
    // GENERATE RESULTS HTML
    // ─────────────────────────────────────────
    generateResultsHTML() {
        let html = '';
        
        for (const [collectionName, result] of Object.entries(this.results)) {
            let cssClass = 'empty';
            if (result.error) cssClass = 'error';
            else if (result.count > 0) cssClass = 'has-data';
            
            html += `
                <div class="collection-result ${cssClass}">
                    <div class="collection-name">${collectionName.toUpperCase()}</div>
                    <div class="collection-details">
                        ${result.error ? 
                            `❌ Error: ${result.error}` : 
                            result.count > 0 ? 
                                `✅ ${result.count} documents found` : 
                                `⚠️ No documents found`
                        }
                    </div>
                    ${result.sample ? `
                        <div class="sample-data">
                            <strong>Sample Document:</strong><br>
                            ID: ${result.sample.id}<br>
                            Data: ${JSON.stringify(result.sample.data, null, 2)}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        return html;
    }

    // ─────────────────────────────────────────
    // CLOSE PANEL
    // ─────────────────────────────────────────
    closePanel() {
        const panel = document.getElementById('firebase-results-panel');
        if (panel) {
            panel.remove();
        }
    }
}

// Initialize and run immediately
window.simpleFirebaseChecker = new SimpleFirebaseChecker();

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.simpleFirebaseChecker) {
            window.simpleFirebaseChecker.init();
        }
    }, 2000); // Wait 2 seconds for Firebase to be ready
});
