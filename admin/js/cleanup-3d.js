// ============================================
// 3D CANVAS CLEANUP MANAGER
// js/cleanup-3d.js
// ============================================

import { registerListener } from './cleanup-manager.js';

class ThreeDCleanupManager {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.animationId = null;
        this.resizeHandler = null;
    }

    // ─────────────────────────────────────────
    // DISPOSE THREE.JS RESOURCES
    // ─────────────────────────────────────────
    disposeThreeJS(renderer, scene) {
        if (!scene || !renderer) return;

        // Dispose all geometries and materials
        scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        if (material.map) material.map.dispose();
                        if (material.normalMap) material.normalMap.dispose();
                        if (material.roughnessMap) material.roughnessMap.dispose();
                        if (material.metalnessMap) material.metalnessMap.dispose();
                        material.dispose();
                    });
                } else {
                    if (object.material.map) object.material.map.dispose();
                    if (object.material.normalMap) object.material.normalMap.dispose();
                    if (object.material.roughnessMap) object.material.roughnessMap.dispose();
                    if (object.material.metalnessMap) object.material.metalnessMap.dispose();
                    object.material.dispose();
                }
            }
        });

        // Dispose renderer
        if (renderer.dispose) {
            renderer.dispose();
        }

        // Force context loss
        if (renderer.forceContextLoss) {
            renderer.forceContextLoss();
        }

        // Remove DOM element
        if (renderer.domElement) {
            renderer.domElement.remove();
        }

        console.log('✅ Three.js resources disposed');
    }

    // ─────────────────────────────────────────
    // SETUP CANVAS RESIZE HANDLING
    // ─────────────────────────────────────────
    setupCanvasResize(canvas, camera, renderer) {
        const container = canvas.parentElement;
        if (!container) return;

        this.resizeHandler = this.debounce(() => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            
            renderer.setSize(width, height);
            
            console.log(`📐 Canvas resized to ${width}x${height}`);
        }, 200);

        registerListener('canvas3d', window, 'resize', this.resizeHandler);
        registerListener('canvas3d', container, 'resize', this.resizeHandler);
    }

    // ─────────────────────────────────────────
    // WEBGL SUPPORT DETECTION
    // ─────────────────────────────────────────
    isWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    // ─────────────────────────────────────────
    // DEBOUNCE FUNCTION
    // ─────────────────────────────────────────
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ─────────────────────────────────────────
    // CLEANUP SECTION
    // ─────────────────────────────────────────
    cleanup() {
        // Remove resize listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        // Dispose Three.js resources
        this.disposeThreeJS(this.renderer, this.scene);

        // Clear references
        this.renderer = null;
        this.scene = null;
        this.camera = null;

        console.log('✅ 3D canvas cleanup completed');
    }
}

// Initialize 3D cleanup manager
window.threeDCleanup = new ThreeDCleanupManager();
