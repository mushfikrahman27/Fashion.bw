// ============================================
// ADMIN MEDIA MANAGER
// ============================================

import { showProgress, hideProgress, showToast } from './utils/ui-helpers.js';
import { logSystemAction } from './utils/audit-log.js';

class AdminMedia {
    constructor() {
        this.mediaFiles = [];
        this.uploadProgress = 0;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.maxWidth = 1200;
        this.quality = 0.8;
        this.uploadQueue = [];
        this.isUploading = false;
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    async init() {
        if (!window.firebaseDB) {
            console.warn('Firebase not ready');
            return;
        }
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

        try {
            // Load media files from database
            const mediaSnap = await get(ref(window.firebaseDB, 'media-files'));
            if (mediaSnap.exists()) {
                this.mediaFiles = Object.values(mediaSnap.val());
            }
            this.render();
        } catch (err) {
            console.error('Media load error:', err);
            this.showToast('Failed to load media files', 'error');
        }
    }

    // ─────────────────────────────────────────
    // RENDER MEDIA GALLERY
    // ─────────────────────────────────────────
    render() {
        const el = document.getElementById('mediaSection');
        if (!el) return;

        el.innerHTML = `
            <div class="section-header">
                <div class="header-content">
                    <h2 class="section-title">📁 Media Manager</h2>
                    <p class="section-subtitle">Upload and manage media files</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="document.getElementById('mediaUploadInput').click()">
                        <i class="fas fa-upload"></i>
                        Upload Files
                    </button>
                </div>
            </div>

            <div class="section-body">
                <!-- Upload Area -->
                <div class="media-upload-area">
                    <input type="file" id="mediaUploadInput" multiple accept="image/*,video/*,.pdf,.doc,.docx" style="display: none;" onchange="media.handleFileUpload(event)">
                    <div class="upload-drop-zone" id="uploadDropZone" ondrop="media.handleDrop(event)" ondragover="media.handleDragOver(event)" ondragleave="media.handleDragLeave(event)">
                        <div class="upload-content">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <h3>Drop files here or click to browse</h3>
                            <p>Support for images, videos, and documents</p>
                        </div>
                    </div>
                    <div class="upload-progress" id="uploadProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <div class="progress-text" id="progressText">Uploading...</div>
                    </div>
                </div>

                <!-- Media Grid -->
                <div class="media-grid">
                    ${this.renderMediaGrid()}
                </div>
            </div>
        `;
    }

    renderMediaGrid() {
        if (this.mediaFiles.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h3>No media files yet</h3>
                    <p>Upload images, videos, and documents to manage your media library</p>
                </div>
            `;
        }

        return this.mediaFiles.map((file, index) => {
            const fileIcon = this.getFileIcon(file.type);
            const fileSize = this.formatFileSize(file.size);
            const uploadDate = new Date(file.uploadedAt).toLocaleDateString();

            return `
                <div class="media-card">
                    <div class="media-preview">
                        ${file.type.startsWith('image/') 
                            ? `<img src="${file.url}" alt="${file.name}" />`
                            : `<div class="file-icon">${fileIcon}</div>`
                        }
                    </div>
                    <div class="media-info">
                        <div class="media-name" title="${file.name}">${file.name}</div>
                        <div class="media-details">
                            <span class="media-size">${fileSize}</span>
                            <span class="media-date">${uploadDate}</span>
                        </div>
                        <div class="media-actions">
                            <button class="btn btn-sm" onclick="media.previewFile('${file.url}', '${file.type}')" title="Preview">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm" onclick="media.copyFileUrl('${file.url}')" title="Copy URL">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="media.deleteFile('${file.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────
    // FILE HANDLING
    // ─────────────────────────────────────────
    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            await this.uploadSingleFile(file);
        }
    }

    // ─────────────────────────────────────────
    // UPLOAD SINGLE FILE WITH OPTIMIZATION
    // ─────────────────────────────────────────
    async uploadSingleFile(file) {
        try {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.isValid) {
                showToast('File validation failed: ' + validation.errors.join(', '), 'error');
                return;
            }

            showProgress('uploadProgressContainer', 0, 'Compressing image...');
            
            // Compress image
            const compressedFile = await this.compressImage(file);
            
            showProgress('uploadProgressContainer', 50, 'Uploading to cloud...');
            
            // Upload to Firebase Storage
            const result = await this.uploadToStorage(compressedFile, (progress) => {
                showProgress('uploadProgressContainer', 50 + (progress * 0.5), 'Uploading to cloud...');
            });
            
            // Add to media list
            this.mediaFiles.push({
                id: Date.now().toString(),
                name: file.name,
                url: result.url,
                type: compressedFile.type,
                size: compressedFile.size,
                uploadedAt: Date.now()
            });
            
            hideProgress('uploadProgressContainer');
            showToast('Image uploaded successfully', 'success');
            this.render();
            
            // Clear file input
            const fileInput = document.getElementById('mediaFileInput');
            if (fileInput) fileInput.value = '';
            
        } catch (error) {
            hideProgress('uploadProgressContainer');
            showToast('Upload failed: ' + error.message, 'error');
            console.error('Upload error:', error);
        }
    }

    // ─────────────────────────────────────────
    // COMPRESS IMAGE WITH WEB WORKER
    // ─────────────────────────────────────────
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            // Create Web Worker for compression
            const worker = new Worker('js/workers/image-worker.js');
            
            worker.onmessage = (e) => {
                if (e.data.blob) {
                    resolve(new File([e.data.blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                        type: 'image/webp'
                    }));
                } else if (e.data.error) {
                    reject(new Error(e.data.error));
                }
            };
            
            worker.onerror = (error) => {
                reject(new Error('Worker error: ' + error.message));
            };
            
            // Send image data to worker
            worker.postMessage({
                imageData: file,
                maxWidth: this.maxWidth,
                quality: this.quality
            });
        });
    }

    // ─────────────────────────────────────────
    // CALCULATE DIMENSIONS
    // ─────────────────────────────────────────
    calculateDimensions(originalWidth, originalHeight) {
        let { width, height } = { width: originalWidth, height: originalHeight };
        
        if (width > this.maxWidth) {
            const ratio = this.maxWidth / width;
            width = this.maxWidth;
            height = Math.round(height * ratio);
        }
        
        return { width, height };
    }

    // ─────────────────────────────────────────
    // VALIDATE FILE
    // ─────────────────────────────────────────
    validateFile(file) {
        const errors = [];
        
        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File size must be less than ${this.maxFileSize / (1024 * 1024)}MB`);
        }
        
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            errors.push(`File type must be JPG, PNG, or WebP. Current type: ${file.type}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ─────────────────────────────────────────
    // UPLOAD TO FIREBASE STORAGE
    // ─────────────────────────────────────────
    async uploadToStorage(file, progressCallback) {
        if (!window.firebaseStorage) {
            throw new Error('Firebase Storage not initialized');
        }
        
        // Create unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const fileName = `images/${timestamp}_${randomId}.webp`;
        
        // Create storage reference
        const storageRef = window.firebaseStorage.ref(fileName);
        
        // Create upload task
        const uploadTask = storageRef.put(file);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                // Progress callback
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressCallback) {
                        progressCallback(Math.round(progress));
                    }
                },
                // Error callback
                (error) => {
                    reject(new Error(`Upload failed: ${error.message}`));
                },
                // Complete callback
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve({
                            url: downloadURL,
                            path: fileName,
                            size: file.size,
                            type: file.type
                        });
                    } catch (error) {
                        reject(new Error(`Failed to get download URL: ${error.message}`));
                    }
                }
            );
        });
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;

        this.showUploadProgress();
        this.uploadFiles(files);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('uploadDropZone').classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('uploadDropZone').classList.remove('drag-over');
    }

    async uploadFiles(files) {
        try {
            const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const { ref: storageRef, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");

            for (const file of files) {
                const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const storageRefPath = `media/${fileId}`;
                const storageRef_obj = storageRef(window.firebaseStorage, storageRefPath);

                // Upload to Firebase Storage
                const snapshot = await uploadBytes(storageRef_obj, file);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // Save file info to Firebase Database
                const fileData = {
                    id: fileId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    url: downloadURL,
                    uploadedAt: Date.now(),
                    uploadedBy: 'admin'
                };

                await set(ref(window.firebaseDB, `media-files/${fileId}`), fileData);
                
                // Add to local array
                this.mediaFiles.push(fileData);
                
                this.updateUploadProgress((this.mediaFiles.length / files.length) * 100);
            }

            this.hideUploadProgress();
            this.render();
            this.showToast(`${files.length} file(s) uploaded successfully`, 'success');

        } catch (err) {
            console.error('Upload error:', err);
            this.showToast('Failed to upload files', 'error');
            this.hideUploadProgress();
        }
    }

    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const { ref: storageRef, deleteObject } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");

            // Delete from database
            await remove(ref(window.firebaseDB, `media-files/${fileId}`));

            // Delete from storage (optional - you might want to keep files in storage)
            const file = this.mediaFiles.find(f => f.id === fileId);
            if (file && file.url.includes('firebasestorage.googleapis.com')) {
                try {
                    const storageRefPath = `media/${fileId}`;
                    const storageRef_obj = storageRef(window.firebaseStorage, storageRefPath);
                    await deleteObject(storageRef_obj);
                } catch (storageErr) {
                    console.warn('Storage delete failed:', storageErr);
                }
            }

            // Remove from local array
            this.mediaFiles = this.mediaFiles.filter(f => f.id !== fileId);
            
            this.render();
            this.showToast('File deleted successfully', 'success');

        } catch (err) {
            console.error('Delete error:', err);
            this.showToast('Failed to delete file', 'error');
        }
    }

    previewFile(url, type) {
        if (type.startsWith('image/')) {
            // Open image in new tab
            window.open(url, '_blank');
        } else {
            // Download other files
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            link.click();
        }
    }

    copyFileUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('URL copied to clipboard', 'success');
        }).catch(() => {
            this.showToast('Failed to copy URL', 'error');
        });
    }

    // ─────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────
    showUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'block';
        document.getElementById('uploadDropZone').style.display = 'none';
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadDropZone').style.display = 'block';
        this.updateUploadProgress(0);
    }

    updateUploadProgress(percent) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `Uploading... ${Math.round(percent)}%`;
    }

    getFileIcon(type) {
        if (type.startsWith('image/')) return '🖼️';
        if (type.startsWith('video/')) return '🎥';
        if (type.includes('pdf')) return '📄';
        if (type.includes('word') || type.includes('document')) return '📝';
        if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
        if (type.includes('powerpoint') || type.includes('presentation')) return '📽';
        return '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `order-toast ${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
    }
}

// Initialize media manager
window.media = new AdminMedia();
document.addEventListener('DOMContentLoaded', () => window.media.init());
