// ============================================
// WEB WORKER FOR IMAGE COMPRESSION
// js/workers/image-worker.js
// ============================================

self.onmessage = async (e) => {
    const { imageData, maxWidth, quality } = e.data;
    
    try {
        // Create bitmap from image data
        const bitmap = await createImageBitmap(imageData);
        
        // Calculate scale to fit within maxWidth
        const scale = Math.min(1, maxWidth / bitmap.width);
        const canvas = new OffscreenCanvas(
            bitmap.width * scale, 
            bitmap.height * scale
        );
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        
        // Convert to WebP blob with specified quality
        const blob = await canvas.convertToBlob({ 
            type: 'image/webp', 
            quality: quality || 0.8 
        });
        
        // Send compressed blob back to main thread
        self.postMessage({ blob });
        
    } catch (error) {
        console.error('Image compression error:', error);
        self.postMessage({ error: error.message });
    }
};

// Helper function to create ImageBitmap
async function createImageBitmap(imageData) {
    if (imageData instanceof ImageBitmap) {
        return imageData;
    }
    
    if (imageData instanceof Blob) {
        return await createImageBitmapFromBlob(imageData);
    }
    
    // Handle other image data types
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(createImageBitmap(img));
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(imageData);
    });
}

async function createImageBitmapFromBlob(blob) {
    return await createImageBitmap(URL.createObjectURL(blob));
}

async function createImageBitmap(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(createImageBitmap(img));
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
        img.crossOrigin = 'anonymous';
    });
}

async function createImageBitmap(img) {
    return await createImageBitmap(img.src);
}
