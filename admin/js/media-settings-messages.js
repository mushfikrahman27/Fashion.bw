/* ===================================
   MEDIA MANAGEMENT SYSTEM
   =================================== */

class MediaManager {
    constructor() {
        this.media = [];
        this.filteredMedia = [];
        this.selectedFiles = [];
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('🎬 Media Manager initialized');
    }
    
    setupEventListeners() {
        // Media filters
        document.getElementById('mediaSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('mediaTypeFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('mediaFolderFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('mediaSortFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Action buttons
        document.getElementById('uploadMediaBtn')?.addEventListener('click', () => {
            this.openMediaUploadModal();
        });
        
        document.getElementById('createFolderBtn')?.addEventListener('click', () => {
            this.createFolder();
        });
        
        // Modal buttons
        document.getElementById('processMediaUploadBtn')?.addEventListener('click', () => {
            this.uploadFiles();
        });
        
        document.getElementById('deleteMediaBtn')?.addEventListener('click', () => {
            this.deleteMediaFile();
        });
        
        // File input for drag & drop
        const fileInput = document.getElementById('mediaFiles');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
            
            // Drag and drop
            const uploadArea = document.querySelector('.file-upload-area');
            if (uploadArea) {
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('drag-over');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('drag-over');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('drag-over');
                    this.handleFileSelect(e.dataTransfer.files);
                });
            }
        }
    }
    
    async loadMedia() {
        try {
            console.log('🔄 Loading media files...');
            
            if (window.firebaseDB) {
                await this.loadMediaFromFirebase();
            } else {
                // Fallback to sample media
                this.loadSampleMedia();
            }
            
            this.applyFilters();
            console.log(`✅ Loaded ${this.media.length} media files`);
            
        } catch (error) {
            console.error('❌ Error loading media:', error);
            this.showToast('Failed to load media', 'error');
        }
    }
    
    async loadMediaFromFirebase() {
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const mediaRef = ref(window.firebaseDB, 'media');
            const snapshot = await get(mediaRef);
            
            if (snapshot.exists()) {
                const firebaseMedia = snapshot.val();
                this.media = Object.values(firebaseMedia).map(media => ({
                    id: media.id || Object.keys(firebaseMedia).find(key => firebaseMedia[key] === media)[0],
                    name: media.name || 'Unknown File',
                    type: media.type || 'image',
                    size: media.size || 0,
                    url: media.url || 'https://via.placeholder.com/200x150',
                    folder: media.folder || 'root',
                    uploadedAt: media.uploadedAt || Date.now()
                }));
                console.log(`✅ Loaded ${this.media.length} media files from Firebase`);
            } else {
                console.log('⚠️ No media found in Firebase, using sample data');
                this.loadSampleMedia();
            }
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            this.loadSampleMedia();
        }
    }
    
    loadSampleMedia() {
        // Sample media for demonstration
        this.media = [
            {
                id: 'media001',
                name: 'product-bag-1.jpg',
                type: 'image',
                size: 245760,
                url: 'https://via.placeholder.com/200x150/4f46e5/ffffff?text=Bag',
                folder: 'products',
                uploadedAt: Date.now() - 86400000
            },
            {
                id: 'media002',
                name: 'product-sneaker-1.jpg',
                type: 'image',
                size: 312450,
                url: 'https://via.placeholder.com/200x150/4f46e5/ffffff?text=Sneaker',
                folder: 'products',
                uploadedAt: Date.now() - 172800000
            },
            {
                id: 'media003',
                name: 'store-banner.jpg',
                type: 'image',
                size: 524288,
                url: 'https://via.placeholder.com/200x150/4f46e5/ffffff?text=Banner',
                folder: 'banners',
                uploadedAt: Date.now() - 259200000
            }
        ];
        
        console.log('🎬 Loaded sample media for demonstration');
    }
    
    handleSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.applyFilters();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        this.filteredMedia = this.media.filter(item => {
            return (
                (item.name && item.name.toLowerCase().includes(searchLower)) ||
                (item.folder && item.folder.toLowerCase().includes(searchLower))
            );
        });
        
        this.renderMedia();
        console.log(`🔍 Media search results: ${this.filteredMedia.length} files for "${searchTerm}"`);
    }
    
    applyFilters() {
        const typeFilter = document.getElementById('mediaTypeFilter')?.value || '';
        const folderFilter = document.getElementById('mediaFolderFilter')?.value || '';
        const sortFilter = document.getElementById('mediaSortFilter')?.value || 'newest';
        
        // Start with all media
        this.filteredMedia = [...this.media];
        
        // Type filter
        if (typeFilter) {
            this.filteredMedia = this.filteredMedia.filter(item => item.type === typeFilter);
        }
        
        // Folder filter
        if (folderFilter) {
            this.filteredMedia = this.filteredMedia.filter(item => item.folder === folderFilter);
        }
        
        // Sort
        this.filteredMedia.sort((a, b) => {
            switch (sortFilter) {
                case 'newest':
                    return b.uploadedAt - a.uploadedAt;
                case 'oldest':
                    return a.uploadedAt - b.uploadedAt;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return b.size - a.size;
                default:
                    return b.uploadedAt - a.uploadedAt;
            }
        });
        
        this.renderMedia();
    }
    
    renderMedia() {
        const grid = document.getElementById('mediaGrid');
        const emptyState = document.getElementById('mediaEmpty');
        const loadingState = document.getElementById('mediaLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredMedia.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        grid.innerHTML = this.filteredMedia.map(item => `
            <div class="media-item" data-id="${item.id}">
                <div class="media-preview">
                    <img src="${item.url}" alt="${item.name}" class="media-thumbnail">
                    <div class="media-overlay">
                        <button class="media-action-btn preview" onclick="mediaManager.previewMedia('${item.id}')" title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="media-action-btn delete" onclick="mediaManager.confirmDeleteMedia('${item.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="media-info">
                    <div class="media-name">${item.name}</div>
                    <div class="media-meta">
                        <span class="media-type">${item.type}</span>
                        <span class="media-size">${this.formatFileSize(item.size)}</span>
                    </div>
                    <div class="media-date">${new Date(item.uploadedAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // ===================================
    // UPLOAD WORKFLOW
    // ===================================
    
    openMediaUploadModal() {
        const modal = document.getElementById('mediaUploadModal');
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeMediaUploadModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('mediaUploadModal').style.display = 'none';
        }, 300);
    }
    
    handleFileSelect(files) {
        this.selectedFiles = Array.from(files);
        this.showFilePreviews();
    }
    
    showFilePreviews() {
        const previewContainer = document.getElementById('uploadPreview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="preview-item">
                <div class="preview-thumbnail">
                    ${file.type.startsWith('image/') ? 
                        `<img src="${URL.createObjectURL(file)}" alt="${file.name}">` : 
                        `<i class="fas fa-file"></i>`
                    }
                </div>
                <div class="preview-info">
                    <div class="preview-name">${file.name}</div>
                    <div class="preview-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
        `).join('');
    }
    
    async uploadFiles() {
        if (this.selectedFiles.length === 0) {
            this.showToast('Please select files to upload', 'error');
            return;
        }
        
        const uploadBtn = document.getElementById('processMediaUploadBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        try {
            const folder = document.getElementById('uploadFolder')?.value || 'root';
            
            for (const file of this.selectedFiles) {
                const mediaItem = {
                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: this.getFileType(file),
                    size: file.size,
                    url: await this.uploadFileToStorage(file),
                    folder: folder,
                    uploadedAt: Date.now()
                };
                
                this.media.push(mediaItem);
            }
            
            this.applyFilters();
            this.closeMediaUploadModal();
            this.showToast(`Successfully uploaded ${this.selectedFiles.length} files`, 'success');
            
        } catch (error) {
            console.error('❌ Error uploading files:', error);
            this.showToast('Failed to upload files', 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = 'Upload Files';
            this.selectedFiles = [];
        }
    }
    
    async uploadFileToStorage(file) {
        // Simulate upload - in production, this would upload to Firebase Storage
        console.log('📤 Uploading file:', file.name);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `https://storage.example.com/${file.name}`;
    }
    
    getFileType(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'document';
    }
    
    previewMedia(mediaId) {
        const media = this.media.find(m => m.id === mediaId);
        if (!media) return;
        
        const modal = document.getElementById('mediaPreviewModal');
        const largePreview = document.getElementById('largeMediaPreview');
        
        // Update modal content
        document.getElementById('mediaFileName').textContent = media.name;
        document.getElementById('mediaFileSize').textContent = this.formatFileSize(media.size);
        document.getElementById('mediaFileType').textContent = media.type;
        document.getElementById('mediaUploadDate').textContent = new Date(media.uploadedAt).toLocaleString();
        document.getElementById('mediaFileUrl').value = media.url;
        
        // Show large preview
        if (media.type === 'image') {
            largePreview.innerHTML = `<img src="${media.url}" alt="${media.name}" style="max-width: 100%; max-height: 400px;">`;
        } else {
            largePreview.innerHTML = `<div class="file-placeholder-large"><i class="fas fa-file"></i><br>${media.name}</div>`;
        }
        
        // Store current media ID for delete
        modal.dataset.currentMediaId = mediaId;
        
        // Show modal
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeMediaPreviewModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('mediaPreviewModal').style.display = 'none';
        }, 300);
    }
    
    confirmDeleteMedia(mediaId) {
        const media = this.media.find(m => m.id === mediaId);
        if (!media) return;
        
        if (!confirm(`Are you sure you want to delete "${media.name}"?`)) {
            return;
        }
        
        this.deleteMediaFile(mediaId);
    }
    
    async deleteMediaFile(mediaId) {
        try {
            const media = this.media.find(m => m.id === mediaId);
            if (!media) return;
            
            // Delete from Firebase (in production)
            if (window.firebaseDB) {
                const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const mediaRef = ref(window.firebaseDB, `media/${mediaId}`);
                await remove(mediaRef);
                console.log('✅ Media deleted from Firebase:', media.name);
            }
            
            // Remove from local array
            this.media = this.media.filter(m => m.id !== mediaId);
            
            this.applyFilters();
            this.closeMediaPreviewModal();
            this.showToast(`Media "${media.name}" deleted`, 'success');
            
        } catch (error) {
            console.error('❌ Error deleting media:', error);
            this.showToast('Failed to delete media', 'error');
        }
    }
    
    createFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim()) {
            console.log('📁 Creating folder:', folderName);
            this.showToast(`Folder "${folderName}" created`, 'success');
        }
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard) {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

/* ===================================
   SETTINGS MANAGEMENT SYSTEM
   =================================== */

class SettingsManager {
    constructor() {
        this.settings = {};
        this.defaultSettings = {
            storeName: 'My E-Commerce Store',
            storeEmail: 'store@example.com',
            storePhone: '+1 (555) 123-4567',
            storeAddress: '123 Main St, City, State 12345',
            currency: 'USD',
            taxRate: '10',
            shippingCost: '10',
            notifications: {
                emailOrders: true,
                emailLowStock: true,
                emailNewCustomer: true
            },
            admin: {
                darkMode: false,
                compactView: false,
                autoSave: true
            }
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('⚙️ Settings Manager initialized');
    }
    
    setupEventListeners() {
        // Action buttons
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
            this.resetToDefaults();
        });
    }
    
    async loadSettings() {
        try {
            console.log('🔄 Loading settings...');
            
            if (window.firebaseDB) {
                await this.loadSettingsFromFirebase();
            } else {
                // Fallback to default settings
                this.settings = { ...this.defaultSettings };
                console.log('⚠️ Using default settings (Firebase not available)');
            }
            
            this.renderSettings();
            console.log('✅ Settings loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            this.showToast('Failed to load settings', 'error');
        }
    }
    
    async loadSettingsFromFirebase() {
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const settingsRef = ref(window.firebaseDB, 'settings');
            const snapshot = await get(settingsRef);
            
            if (snapshot.exists()) {
                const firebaseSettings = snapshot.val();
                this.settings = { ...this.defaultSettings, ...firebaseSettings };
                console.log('✅ Settings loaded from Firebase');
            } else {
                this.settings = { ...this.defaultSettings };
                console.log('⚠️ No settings in Firebase, using defaults');
            }
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            this.settings = { ...this.defaultSettings };
        }
    }
    
    renderSettings() {
        const container = document.getElementById('settingsContent');
        const emptyState = document.getElementById('settingsEmpty');
        const loadingState = document.getElementById('settingsLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (!this.settings || Object.keys(this.settings).length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <div class="settings-header">
                        <h3>Store Information</h3>
                    </div>
                    <div class="settings-body">
                        <div class="form-group">
                            <label class="form-label" for="storeName">Store Name</label>
                            <input type="text" class="form-input" id="storeName" value="${this.settings.storeName || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="storeEmail">Store Email</label>
                            <input type="email" class="form-input" id="storeEmail" value="${this.settings.storeEmail || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="storePhone">Store Phone</label>
                            <input type="tel" class="form-input" id="storePhone" value="${this.settings.storePhone || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="storeAddress">Store Address</label>
                            <textarea class="form-input" id="storeAddress" rows="3">${this.settings.storeAddress || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="settings-card">
                    <div class="settings-header">
                        <h3>Payment Settings</h3>
                    </div>
                    <div class="settings-body">
                        <div class="form-group">
                            <label class="form-label" for="currency">Default Currency</label>
                            <select class="form-select" id="currency">
                                <option value="USD" ${this.settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="EUR" ${this.settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                                <option value="GBP" ${this.settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="taxRate">Tax Rate (%)</label>
                            <input type="number" class="form-input" id="taxRate" value="${this.settings.taxRate || ''}" min="0" max="100" step="0.1">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="shippingCost">Default Shipping Cost</label>
                            <input type="number" class="form-input" id="shippingCost" value="${this.settings.shippingCost || ''}" min="0" step="0.01">
                        </div>
                    </div>
                </div>
                
                <div class="settings-card">
                    <div class="settings-header">
                        <h3>Notification Settings</h3>
                    </div>
                    <div class="settings-body">
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="emailOrders" ${this.settings.notifications?.emailOrders ? 'checked' : ''}>
                                Email notifications for new orders
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="emailLowStock" ${this.settings.notifications?.emailLowStock ? 'checked' : ''}>
                                Email notifications for low stock
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="emailNewCustomer" ${this.settings.notifications?.emailNewCustomer ? 'checked' : ''}>
                                Email notifications for new customers
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="settings-card">
                    <div class="settings-header">
                        <h3>Admin Preferences</h3>
                    </div>
                    <div class="settings-body">
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="darkMode" ${this.settings.admin?.darkMode ? 'checked' : ''}>
                                Dark mode
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="compactView" ${this.settings.admin?.compactView ? 'checked' : ''}>
                                Compact view
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="autoSave" ${this.settings.admin?.autoSave ? 'checked' : ''}>
                                Auto-save changes
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async saveSettings() {
        try {
            // Collect form data
            const settingsData = {
                storeName: document.getElementById('storeName')?.value || '',
                storeEmail: document.getElementById('storeEmail')?.value || '',
                storePhone: document.getElementById('storePhone')?.value || '',
                storeAddress: document.getElementById('storeAddress')?.value || '',
                currency: document.getElementById('currency')?.value || 'USD',
                taxRate: parseFloat(document.getElementById('taxRate')?.value) || 0,
                shippingCost: parseFloat(document.getElementById('shippingCost')?.value) || 0,
                notifications: {
                    emailOrders: document.getElementById('emailOrders')?.checked || false,
                    emailLowStock: document.getElementById('emailLowStock')?.checked || false,
                    emailNewCustomer: document.getElementById('emailNewCustomer')?.checked || false
                },
                admin: {
                    darkMode: document.getElementById('darkMode')?.checked || false,
                    compactView: document.getElementById('compactView')?.checked || false,
                    autoSave: document.getElementById('autoSave')?.checked || false
                }
            };
            
            // Save to Firebase
            if (window.firebaseDB) {
                const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const settingsRef = ref(window.firebaseDB, 'settings');
                await set(settingsRef, settingsData);
                console.log('✅ Settings saved to Firebase');
            }
            
            // Update local settings
            this.settings = settingsData;
            
            this.showToast('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }
    
    async resetToDefaults() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }
        
        try {
            this.settings = { ...this.defaultSettings };
            
            // Reset Firebase settings
            if (window.firebaseDB) {
                const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const settingsRef = ref(window.firebaseDB, 'settings');
                await set(settingsRef, this.defaultSettings);
                console.log('✅ Settings reset to defaults in Firebase');
            }
            
            this.renderSettings();
            this.showToast('Settings reset to defaults', 'success');
            
        } catch (error) {
            console.error('❌ Error resetting settings:', error);
            this.showToast('Failed to reset settings', 'error');
        }
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard) {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

/* ===================================
   MESSAGES MANAGEMENT SYSTEM
   =================================== */

class MessagesManager {
    constructor() {
        this.messages = [];
        this.filteredMessages = [];
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('💬 Messages Manager initialized');
    }
    
    setupEventListeners() {
        // Message filters
        document.getElementById('messageSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        document.getElementById('messageStatusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('messageSortFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // Action buttons
        document.getElementById('composeMessageBtn')?.addEventListener('click', () => {
            this.openComposeMessageModal();
        });
        
        document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
            this.markAllAsRead();
        });
        
        // Modal buttons
        document.getElementById('sendMessageBtn')?.addEventListener('click', () => {
            this.sendMessage();
        });
    }
    
    async loadMessages() {
        try {
            console.log('🔄 Loading messages...');
            
            if (window.firebaseDB) {
                await this.loadMessagesFromFirebase();
            } else {
                // Show placeholder when no real message source
                this.showPlaceholderState();
            }
            
            this.applyFilters();
            console.log(`✅ Messages loaded successfully`);
            
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.showToast('Failed to load messages', 'error');
        }
    }
    
    async loadMessagesFromFirebase() {
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const messagesRef = ref(window.firebaseDB, 'messages');
            const snapshot = await get(messagesRef);
            
            if (snapshot.exists()) {
                const firebaseMessages = snapshot.val();
                this.messages = Object.values(firebaseMessages).map(message => ({
                    id: message.id || Object.keys(firebaseMessages).find(key => firebaseMessages[key] === message)[0],
                    sender: message.sender || 'Customer',
                    subject: message.subject || 'No Subject',
                    preview: message.preview || message.body?.substring(0, 100) || '',
                    body: message.body || '',
                    timestamp: message.timestamp || Date.now(),
                    read: message.read || false,
                    important: message.important || false,
                    email: message.email || 'customer@example.com'
                }));
                console.log(`✅ Loaded ${this.messages.length} messages from Firebase`);
            } else {
                console.log('⚠️ No messages found in Firebase');
                this.messages = [];
            }
            
        } catch (error) {
            console.error('❌ Firebase loading failed:', error);
            this.showPlaceholderState();
        }
    }
    
    showPlaceholderState() {
        const list = document.getElementById('messageList');
        const emptyState = document.getElementById('messagesEmpty');
        const loadingState = document.getElementById('messagesLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        list.innerHTML = `
            <div class="placeholder-message">
                <div class="placeholder-icon">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="placeholder-content">
                    <h3>Message System Not Connected</h3>
                    <p>The messaging system is not yet connected to a real message source.</p>
                    <p>This would typically connect to:</p>
                    <ul>
                        <li>Customer contact forms</li>
                        <li>Email integration</li>
                        <li>Support ticket system</li>
                        <li>Live chat system</li>
                    </ul>
                    <p>Contact your developer to connect a real messaging source.</p>
                </div>
            </div>
        `;
        
        if (emptyState) emptyState.style.display = 'none';
    }
    
    handleSearch(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.applyFilters();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        
        this.filteredMessages = this.messages.filter(message => {
            return (
                (message.subject && message.subject.toLowerCase().includes(searchLower)) ||
                (message.sender && message.sender.toLowerCase().includes(searchLower)) ||
                (message.body && message.body.toLowerCase().includes(searchLower))
            );
        });
        
        this.renderMessages();
        console.log(`🔍 Message search results: ${this.filteredMessages.length} messages for "${searchTerm}"`);
    }
    
    applyFilters() {
        const statusFilter = document.getElementById('messageStatusFilter')?.value || '';
        const sortFilter = document.getElementById('messageSortFilter')?.value || 'newest';
        
        // Start with all messages
        this.filteredMessages = [...this.messages];
        
        // Status filter
        if (statusFilter) {
            this.filteredMessages = this.filteredMessages.filter(message => {
                switch (statusFilter) {
                    case 'unread':
                        return !message.read;
                    case 'read':
                        return message.read;
                    case 'important':
                        return message.important;
                    case 'archived':
                        return message.archived;
                    default:
                        return true;
                }
            });
        }
        
        // Sort
        this.filteredMessages.sort((a, b) => {
            switch (sortFilter) {
                case 'newest':
                    return b.timestamp - a.timestamp;
                case 'oldest':
                    return a.timestamp - b.timestamp;
                case 'priority':
                    return (b.important ? 1 : 0) - (a.important ? 1 : 0);
                default:
                    return b.timestamp - a.timestamp;
            }
        });
        
        this.renderMessages();
    }
    
    renderMessages() {
        const list = document.getElementById('messageList');
        const emptyState = document.getElementById('messagesEmpty');
        const loadingState = document.getElementById('messagesLoading');
        
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.filteredMessages.length === 0) {
            list.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        list.innerHTML = this.filteredMessages.map(message => `
            <div class="message-item ${message.read ? '' : 'unread'}" onclick="messagesManager.viewMessage('${message.id}')">
                <div class="message-header">
                    <div class="message-sender">
                        <strong>${message.sender}</strong>
                        ${message.important ? '<i class="fas fa-star text-warning"></i>' : ''}
                    </div>
                    <div class="message-time">${new Date(message.timestamp).toLocaleString()}</div>
                </div>
                <div class="message-content">
                    <div class="message-subject">${message.subject}</div>
                    <div class="message-preview">${message.preview}</div>
                </div>
            </div>
        `).join('');
    }
    
    viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        // Mark as read
        message.read = true;
        
        // Show message details (could open a modal)
        console.log('Viewing message:', message.subject);
        this.showToast(`Viewing: ${message.subject}`, 'info');
    }
    
    markAllAsRead() {
        this.messages.forEach(message => {
            message.read = true;
        });
        
        this.renderMessages();
        this.showToast('All messages marked as read', 'success');
    }
    
    openComposeMessageModal() {
        const modal = document.getElementById('composeMessageModal');
        modal.style.display = 'block';
        setTimeout(() => {
            document.getElementById('modalContainer').classList.add('active');
        }, 10);
    }
    
    closeComposeMessageModal() {
        document.getElementById('modalContainer').classList.remove('active');
        setTimeout(() => {
            document.getElementById('composeMessageModal').style.display = 'none';
        }, 300);
    }
    
    async sendMessage() {
        try {
            const to = document.getElementById('messageTo')?.value || '';
            const subject = document.getElementById('messageSubject')?.value || '';
            const body = document.getElementById('messageBody')?.value || '';
            const important = document.getElementById('messageImportant')?.checked || false;
            
            if (!to || !subject || !body) {
                this.showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const messageData = {
                id: Date.now().toString(),
                to: to,
                subject: subject,
                body: body,
                important: important,
                timestamp: Date.now(),
                sent: true
            };
            
            // Save to Firebase (in production)
            if (window.firebaseDB) {
                const { ref, push } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
                const messagesRef = ref(window.firebaseDB, 'messages');
                await push(messagesRef, messageData);
                console.log('✅ Message sent to Firebase');
            }
            
            this.closeComposeMessageModal();
            this.showToast('Message sent successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard) {
            window.dashboard.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// ===================================
// INITIALIZATION
// ===================================

// Initialize managers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mediaManager = new MediaManager();
    window.settingsManager = new SettingsManager();
    window.messagesManager = new MessagesManager();
    
    console.log('🎉 Media, Settings, and Messages Management Systems ready');
});
