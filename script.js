class FSJALGenerator {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.canvasBackground = document.getElementById('canvas-background');
        this.canvasCenterImage = document.getElementById('canvas-center-image');
        this.canvasLayers = document.getElementById('canvas-layers');
        this.layersList = document.getElementById('layers-list');
        this.layersEmpty = document.getElementById('layers-empty');
        this.layersCount = document.getElementById('layers-count');
        this.notifications = document.getElementById('notifications');
        this.backgroundColorPicker = document.getElementById('background-color-picker');
        
        this.layers = [];
        this.activeLayer = null;
        this.dragState = null;
        this.resizeState = null;
        this.rotateState = null;
        this.layerCounter = 0;
        this.currentCategory = 'hat';
        this.currentBackgroundColor = '#ffffff';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadStoredAssets();
        this.updateLayersDisplay();
        this.setupCanvasResponsiveness();
        this.initializeFSJALImage();
        this.setupColorPicker();
        this.updateCanvasScale();
        this.setupMobileExport();
        this.setupScrollIndicators();
    }
    
    initializeFSJALImage() {
        // Ensure the FSJAL image is properly displayed for PFP style
        const fsjalImage = document.getElementById('fsjal-image');
        if (fsjalImage) {
            // Let CSS handle the sizing - don't override it
            fsjalImage.onerror = () => {
                fsjalImage.style.display = 'none';
            };
        }
    }
    
    setupColorPicker() {
        // Color picker input with debounce to prevent notification spam
        if (this.backgroundColorPicker) {
            this.backgroundColorPicker.addEventListener('input', (e) => {
                this.changeBackgroundColor(e.target.value, false); // Don't show notification on input
            });
            
            // Show notification only on final color change
            this.backgroundColorPicker.addEventListener('change', (e) => {
                this.showNotification(`Background color changed to ${e.target.value}`, 'success');
            });
        }
        
        // Color preset buttons
        const colorPresets = document.querySelectorAll('.color-preset');
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                this.changeBackgroundColor(color, true); // Show notification on preset click
                if (this.backgroundColorPicker) {
                    this.backgroundColorPicker.value = color;
                }
            });
        });
    }
    
    changeBackgroundColor(color, showNotification = true) {
        this.currentBackgroundColor = color;
        if (this.canvasBackground) {
            this.canvasBackground.style.backgroundColor = color;
        }
        if (showNotification) {
            this.showNotification(`Background color changed to ${color}`, 'success');
        }
    }
    
    updateCanvasScale() {
        // Get the current canvas scale from CSS custom property
        const canvasContainer = document.querySelector('.canvas-container');
        const computedStyle = getComputedStyle(canvasContainer);
        this.canvasScale = parseFloat(computedStyle.getPropertyValue('--canvas-scale')) || 1;
    }
    
    getCanvasScale() {
        return this.canvasScale || 1;
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0);
    }
    
    setupMobileExport() {
        if (this.isMobile()) {
            // Add long-press functionality to canvas
            let longPressTimer = null;
            let touchStartTime = 0;
            let longPressIndicator = null;
            
            const startLongPress = (e) => {
                // Only trigger if not interacting with layers
                if (e.target.closest('.draggable-layer') || e.target.closest('.resize-handle') || e.target.closest('.rotate-handle')) {
                    return;
                }
                
                touchStartTime = Date.now();
                
                // Add visual feedback
                this.canvas.classList.add('long-press-active');
                
                // Add progress indicator
                longPressIndicator = document.createElement('div');
                longPressIndicator.className = 'long-press-indicator';
                longPressIndicator.innerHTML = '📸';
                this.canvas.appendChild(longPressIndicator);
                
                longPressTimer = setTimeout(() => {
                    // Remove visual feedback
                    this.canvas.classList.remove('long-press-active');
                    
                    // Remove indicator
                    if (longPressIndicator && longPressIndicator.parentNode) {
                        longPressIndicator.parentNode.removeChild(longPressIndicator);
                        longPressIndicator = null;
                    }
                    
                    // Trigger export after 800ms long press
                    this.exportFSJAL();
                    
                    // Provide haptic feedback if available
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }, 800);
            };
            
            const cancelLongPress = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                // Remove visual feedback
                this.canvas.classList.remove('long-press-active');
                
                // Remove any existing indicator
                if (longPressIndicator && longPressIndicator.parentNode) {
                    longPressIndicator.parentNode.removeChild(longPressIndicator);
                    longPressIndicator = null;
                }
            };
            
            // Add long-press to canvas
            this.canvas.addEventListener('touchstart', startLongPress, { passive: true });
            this.canvas.addEventListener('touchend', cancelLongPress, { passive: true });
            this.canvas.addEventListener('touchmove', (e) => {
                // Cancel long press if user moves finger too much (scrolling/dragging)
                cancelLongPress();
            }, { passive: true });
            
            // Add better touch handling to export button
            const exportBtn = document.getElementById('export-btn');
            exportBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                exportBtn.style.transform = 'translateY(1px)';
            }, { passive: false });
            
            exportBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                exportBtn.style.transform = '';
                this.exportFSJAL();
            }, { passive: false });
            
            // Show mobile export tip
            this.showMobileExportTip();
        }
    }
    
    showMobileExportTip() {
        // Show tip only once
        if (localStorage.getItem('fsjal_mobile_tip_shown')) {
            return;
        }
        
        setTimeout(() => {
            this.showNotification('💡 Tip: Long-press the canvas or tap Export to save your FSJAL!', 'info');
            localStorage.setItem('fsjal_mobile_tip_shown', 'true');
        }, 2000);
    }
    
    setupScrollIndicators() {
        // Check if panels are scrollable and add indicators
        this.updateScrollIndicators();
        
        // Update indicators on window resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.updateScrollIndicators(), 100);
        });
        
        // Update indicators when content changes
        const observer = new MutationObserver(() => {
            this.updateScrollIndicators();
        });
        
        // Observe changes in panel contents
        document.querySelectorAll('.panel-content').forEach(panel => {
            observer.observe(panel, { childList: true, subtree: true });
        });
    }
    
    updateScrollIndicators() {
        document.querySelectorAll('.panel-content').forEach(content => {
            const panel = content.closest('.panel');
            const isScrollable = content.scrollHeight > content.clientHeight;
            
            if (isScrollable) {
                content.setAttribute('data-scrollable', 'true');
                panel.setAttribute('data-has-scroll', 'true');
            } else {
                content.removeAttribute('data-scrollable');
                panel.removeAttribute('data-has-scroll');
            }
        });
    }
    
    setupEventListeners() {
        // Upload modal
        document.getElementById('upload-btn').addEventListener('click', () => this.openUploadModal());
        document.getElementById('close-modal').addEventListener('click', () => this.closeUploadModal());
        document.getElementById('modal-backdrop').addEventListener('click', () => this.closeUploadModal());
        document.getElementById('cancel-upload').addEventListener('click', () => this.closeUploadModal());
        
        // File input
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('file-input-display').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        // Upload form
        document.getElementById('upload-form').addEventListener('submit', (e) => this.handleUpload(e));
        
        // Canvas controls
        document.getElementById('reset-btn').addEventListener('click', () => this.resetCanvas());
        
        // Export button with better mobile support
        const exportBtn = document.getElementById('export-btn');
        exportBtn.addEventListener('click', () => this.exportFSJAL());
        
        // Add touch handling for mobile (if not already handled in setupMobileExport)
        if (!this.isMobile()) {
            exportBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.exportFSJAL();
            }, { passive: false });
        }
        
        // Canvas events
        this.canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.canvas.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Global mouse events for dragging and resizing
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events for mobile support
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        document.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Window resize handler for canvas responsiveness
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    setupCanvasResponsiveness() {
        // Initial canvas size check
        this.checkCanvasVisibility();
        
        // Set up intersection observer to detect when canvas goes out of view
        if ('IntersectionObserver' in window) {
            this.canvasObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.target === this.canvas) {
                        if (entry.intersectionRatio < 0.5) {
                            // Canvas is partially or completely out of view
                            this.adjustCanvasSize();
                        }
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: [0.1, 0.5, 0.9]
            });
            
            this.canvasObserver.observe(this.canvas);
        }
    }
    
    handleWindowResize() {
        // Debounce resize handler
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateCanvasScale();
            this.checkCanvasVisibility();
            this.adjustCanvasSize();
        }, 150);
    }
    
    checkCanvasVisibility() {
        const canvas = this.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Check if canvas is completely outside viewport
        if (canvasRect.bottom < 0 || canvasRect.top > viewportHeight ||
            canvasRect.right < 0 || canvasRect.left > viewportWidth) {
            
            // Canvas is outside viewport, scroll it into view
            canvas.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });
        }
    }
    
    adjustCanvasSize() {
        // Canvas scaling is now handled by CSS custom properties
        // This method can be simplified or removed in the future
        // For now, we'll just ensure the canvas is visible
        this.checkCanvasVisibility();
    }
    
    loadCategoryAssets(category) {
        const grid = document.getElementById(`${category}-grid`);
        const empty = grid.querySelector('.asset-empty');
        
        // Get stored assets for this category
        const storedAssets = this.getStoredAssetsSafe(category);
        
        if (storedAssets.length === 0) {
            empty.style.display = 'flex';
            return;
        }
        
        empty.style.display = 'none';
        
        // Remove existing asset items (keep the empty state)
        const existingItems = grid.querySelectorAll('.asset-item');
        existingItems.forEach(item => item.remove());
        
        // Create asset items
        storedAssets.forEach(asset => {
            const assetItem = this.createAssetItem(asset);
            grid.appendChild(assetItem);
        });
        
        // Update count
        document.getElementById(`${category}-count`).textContent = storedAssets.length;
        
        // Update scroll indicators after assets load
        setTimeout(() => this.updateScrollIndicators(), 50);
    }
    
    createAssetItem(asset) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.draggable = true;
        
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.name;
        img.loading = 'lazy';
        
        const name = document.createElement('div');
        name.className = 'asset-name';
        name.textContent = asset.name;
        
        item.appendChild(img);
        item.appendChild(name);
        
        // Add event listeners
        item.addEventListener('dragstart', (e) => this.handleAssetDragStart(e, asset));
        item.addEventListener('touchstart', (e) => this.handleAssetTouchStart(e, asset), { passive: false });
        
        // Add click to add functionality
        item.addEventListener('click', () => {
            this.addAssetToCanvas(asset);
        });
        
        return item;
    }
    
    handleAssetDragStart(e, asset) {
        e.dataTransfer.setData('application/json', JSON.stringify(asset));
        e.dataTransfer.effectAllowed = 'copy';
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.canvas.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        // Only remove drag-over class if leaving the canvas entirely
        if (!this.canvas.contains(e.relatedTarget)) {
            this.canvas.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.canvas.classList.remove('drag-over');
        
        try {
            const assetData = JSON.parse(e.dataTransfer.getData('application/json'));
            
            // Calculate drop position relative to canvas
            const canvasRect = this.canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;
            
            this.addAssetToCanvas(assetData, x, y);
            this.showNotification(`Added ${assetData.name} to canvas`, 'success');
        } catch (error) {
            this.showNotification('Error adding asset to canvas', 'error');
        }
    }
    
    addAssetToCanvas(asset, x = null, y = null) {
        // Create a new layer for the asset
        const layer = this.createLayer(asset, x, y);
        this.layers.push(layer);
        this.updateLayersDisplay();
        this.setActiveLayer(layer);
    }
    
    createLayer(asset, x = null, y = null) {
        const layerId = `layer-${++this.layerCounter}`;
        
        // Create layer element
        const layerElement = document.createElement('div');
        layerElement.className = 'draggable-layer';
        layerElement.id = layerId;
        layerElement.style.position = 'absolute';
        layerElement.style.width = '100px';
        layerElement.style.height = '100px';
        
        // Set initial position
        if (x !== null && y !== null) {
            layerElement.style.left = `${x - 50}px`;
            layerElement.style.top = `${y - 50}px`;
        } else {
            // Center the layer
            layerElement.style.left = '50%';
            layerElement.style.top = '50%';
            layerElement.style.transform = 'translate(-50%, -50%)';
        }
        
        // Create image element
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'fill';
        img.draggable = false;
        
        layerElement.appendChild(img);
        
        // Add resize handles
        this.addResizeHandles(layerElement);
        
        // Add event listeners
        layerElement.addEventListener('mousedown', (e) => this.handleLayerMouseDown(e, layerId));
        layerElement.addEventListener('touchstart', (e) => this.handleLayerTouchStart(e, layerId), { passive: false });
        
        // Add to canvas
        this.canvasLayers.appendChild(layerElement);
        
        // Create layer object
        const layer = {
            id: layerId,
            name: asset.name,
            element: layerElement,
            asset: asset,
            visible: true,
            x: x || 0,
            y: y || 0,
            width: 100,
            height: 100
        };
        
        return layer;
    }
    
    addResizeHandles(element) {
        const positions = ['nw', 'ne', 'sw', 'se'];
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.addEventListener('mousedown', (e) => this.handleResizeStart(e, element, pos));
            handle.addEventListener('touchstart', (e) => this.handleResizeTouchStart(e, element, pos), { passive: false });
            element.appendChild(handle);
        });
        
        // Add rotate handle
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.innerHTML = '↻';
        rotateHandle.addEventListener('mousedown', (e) => this.handleRotateStart(e, element));
        rotateHandle.addEventListener('touchstart', (e) => this.handleRotateTouchStart(e, element), { passive: false });
        element.appendChild(rotateHandle);
    }
    
    handleLayerMouseDown(e, layerId) {
        e.preventDefault();
        e.stopPropagation();
        
        // Don't start dragging if clicking on resize handle or rotate handle
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) {
            return;
        }
        
        const layer = this.layers.find(l => l.id === layerId);
        if (!layer) return;
        
        this.setActiveLayer(layer);
        
        this.dragState = {
            element: layer.element,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: parseInt(layer.element.style.left) || 0,
            startTop: parseInt(layer.element.style.top) || 0
        };
        
        layer.element.style.cursor = 'grabbing';
    }
    
    handleRotateStart(e, element) {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Get current rotation
        const currentTransform = element.style.transform || '';
        const rotateMatch = currentTransform.match(/rotate\(([^)]+)\)/);
        const currentRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
        
        // Calculate initial angle from center to start position
        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        this.rotateState = {
            element: element,
            startX: e.clientX,
            startY: e.clientY,
            centerX: centerX,
            centerY: centerY,
            startRotation: currentRotation,
            startAngle: startAngle
        };
        
        element.classList.add('rotating');
        document.body.style.cursor = 'grabbing';
    }
    
    handleRotateTouchStart(e, element) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Get current rotation
        const currentTransform = element.style.transform || '';
        const rotateMatch = currentTransform.match(/rotate\(([^)]+)\)/);
        const currentRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
        
        // Calculate initial angle from center to start position
        const startAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * (180 / Math.PI);
        
        this.rotateState = {
            element: element,
            startX: touch.clientX,
            startY: touch.clientY,
            centerX: centerX,
            centerY: centerY,
            startRotation: currentRotation,
            startAngle: startAngle
        };
        
        element.classList.add('rotating');
        
        // Prevent default touch behaviors for smoother rotation
        document.body.style.touchAction = 'none';
    }
    
    handleResizeStart(e, element, position) {
        e.preventDefault();
        e.stopPropagation();
        
        this.resizeState = {
            element: element,
            position: position,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: element.offsetWidth,
            startHeight: element.offsetHeight,
            startLeft: parseInt(element.style.left) || 0,
            startTop: parseInt(element.style.top) || 0
        };
        
        element.classList.add('resizing');
        document.body.style.cursor = `${position}-resize`;
    }
    
    handleMouseMove(e) {
        if (this.dragState) {
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;
            
            const newLeft = this.dragState.startLeft + deltaX;
            const newTop = this.dragState.startTop + deltaY;
            
            // Smoother dragging - preserve existing transform if any
            const currentTransform = this.dragState.element.style.transform || '';
            const rotateMatch = currentTransform.match(/rotate\([^)]+\)/);
            const rotateTransform = rotateMatch ? rotateMatch[0] : '';
            
            this.dragState.element.style.left = `${newLeft}px`;
            this.dragState.element.style.top = `${newTop}px`;
            this.dragState.element.style.transform = rotateTransform;
        }
        
        if (this.resizeState) {
            const deltaX = e.clientX - this.resizeState.startX;
            const deltaY = e.clientY - this.resizeState.startY;
            
            this.performResize(deltaX, deltaY);
        }
        
        if (this.rotateState) {
            // Calculate current angle from center to current mouse position
            const currentAngle = Math.atan2(e.clientY - this.rotateState.centerY, e.clientX - this.rotateState.centerX) * (180 / Math.PI);
            
            // Calculate the angle difference from where we started
            const angleDiff = currentAngle - this.rotateState.startAngle;
            
            // Apply the rotation change to the original rotation
            const rotation = this.rotateState.startRotation + angleDiff;
            
            this.rotateState.element.style.transform = `rotate(${rotation}deg)`;
        }
    }
    
    handleMouseUp(e) {
        if (this.dragState) {
            this.dragState.element.style.cursor = 'move';
            this.dragState = null;
        }
        
        if (this.resizeState) {
            this.resizeState.element.classList.remove('resizing');
            document.body.style.cursor = 'default';
            this.resizeState = null;
        }
        
        if (this.rotateState) {
            this.rotateState.element.classList.remove('rotating');
            document.body.style.cursor = 'default';
            this.rotateState = null;
        }
    }
    
    handleAssetTouchStart(e, asset) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        
        let hasMoved = false;
        
        const handleTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);
            
            if (deltaX > 10 || deltaY > 10) {
                hasMoved = true;
            }
        };
        
        const handleTouchEnd = (e) => {
            e.preventDefault();
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            
            if (!hasMoved) {
                // Treat as tap - add asset to canvas
                this.addAssetToCanvas(asset);
            }
        };
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    handleLayerTouchStart(e, layerId) {
        e.preventDefault();
        e.stopPropagation();
        
        // Don't start dragging if touching resize handle or rotate handle
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) {
            return;
        }
        
        const layer = this.layers.find(l => l.id === layerId);
        if (!layer) return;
        
        this.setActiveLayer(layer);
        
        const touch = e.touches[0];
        this.dragState = {
            element: layer.element,
            startX: touch.clientX,
            startY: touch.clientY,
            startLeft: parseInt(layer.element.style.left) || 0,
            startTop: parseInt(layer.element.style.top) || 0
        };
        
        // Prevent default touch behaviors for smoother dragging
        document.body.style.touchAction = 'none';
    }
    
    handleResizeTouchStart(e, element, position) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        this.resizeState = {
            element: element,
            position: position,
            startX: touch.clientX,
            startY: touch.clientY,
            startWidth: element.offsetWidth,
            startHeight: element.offsetHeight,
            startLeft: parseInt(element.style.left) || 0,
            startTop: parseInt(element.style.top) || 0
        };
        
        element.classList.add('resizing');
        
        // Prevent default touch behaviors
        document.body.style.touchAction = 'none';
    }
    
    handleTouchMove(e) {
        if (this.dragState || this.resizeState || this.rotateState) {
            e.preventDefault();
        }
        
        if (this.dragState) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.dragState.startX;
            const deltaY = touch.clientY - this.dragState.startY;
            
            const newLeft = this.dragState.startLeft + deltaX;
            const newTop = this.dragState.startTop + deltaY;
            
            // Smoother dragging - preserve existing transform if any
            const currentTransform = this.dragState.element.style.transform || '';
            const rotateMatch = currentTransform.match(/rotate\([^)]+\)/);
            const rotateTransform = rotateMatch ? rotateMatch[0] : '';
            
            this.dragState.element.style.left = `${newLeft}px`;
            this.dragState.element.style.top = `${newTop}px`;
            this.dragState.element.style.transform = rotateTransform;
        }
        
        if (this.resizeState) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.resizeState.startX;
            const deltaY = touch.clientY - this.resizeState.startY;
            
            this.performResize(deltaX, deltaY);
        }
        
        if (this.rotateState) {
            const touch = e.touches[0];
            
            // Calculate current angle from center to current touch position
            const currentAngle = Math.atan2(touch.clientY - this.rotateState.centerY, touch.clientX - this.rotateState.centerX) * (180 / Math.PI);
            
            // Calculate the angle difference from where we started
            const angleDiff = currentAngle - this.rotateState.startAngle;
            
            // Apply the rotation change to the original rotation
            const rotation = this.rotateState.startRotation + angleDiff;
            
            this.rotateState.element.style.transform = `rotate(${rotation}deg)`;
        }
    }
    
    handleTouchEnd(e) {
        if (this.dragState) {
            this.dragState = null;
        }
        
        if (this.resizeState) {
            this.resizeState.element.classList.remove('resizing');
            this.resizeState = null;
        }
        
        if (this.rotateState) {
            this.rotateState.element.classList.remove('rotating');
            this.rotateState = null;
        }
        
        // Restore default touch behaviors
        document.body.style.touchAction = '';
    }
    
    performResize(deltaX, deltaY) {
        const { element, position, startWidth, startHeight, startLeft, startTop } = this.resizeState;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
        
        // Calculate new dimensions based on resize handle position
        switch (position) {
            case 'nw':
                newWidth = startWidth - deltaX;
                newHeight = startHeight - deltaY;
                newLeft = startLeft + deltaX;
                newTop = startTop + deltaY;
                break;
            case 'ne':
                newWidth = startWidth + deltaX;
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
                break;
            case 'sw':
                newWidth = startWidth - deltaX;
                newHeight = startHeight + deltaY;
                newLeft = startLeft + deltaX;
                break;
            case 'se':
                newWidth = startWidth + deltaX;
                newHeight = startHeight + deltaY;
                break;
        }
        
        // Enforce minimum size
        const minSize = 20;
        newWidth = Math.max(minSize, newWidth);
        newHeight = Math.max(minSize, newHeight);
        
        // Apply new dimensions while preserving rotation
        const currentTransform = element.style.transform || '';
        const rotateMatch = currentTransform.match(/rotate\([^)]+\)/);
        const rotateTransform = rotateMatch ? rotateMatch[0] : '';
        
        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.style.transform = rotateTransform;
    }
    
    setActiveLayer(layer) {
        // Remove active class from all layers
        this.layers.forEach(l => {
            l.element.classList.remove('active');
        });
        
        // Remove active class from all layer items
        document.querySelectorAll('.layer-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Set new active layer
        this.activeLayer = layer;
        if (layer) {
            layer.element.classList.add('active');
            
            // Highlight corresponding layer item
            const layerItem = document.getElementById(`layer-item-${layer.id}`);
            if (layerItem) {
                layerItem.classList.add('active');
            }
        }
    }
    
    updateLayersDisplay() {
        const count = this.layers.length;
        this.layersCount.textContent = `${count} layer${count !== 1 ? 's' : ''}`;
        
        if (count === 0) {
            this.layersEmpty.style.display = 'block';
            this.layersList.innerHTML = '';
            this.layersList.appendChild(this.layersEmpty);
        } else {
            this.layersEmpty.style.display = 'none';
            this.layersList.innerHTML = '';
            
            // Add layers in reverse order (top layer first)
            this.layers.slice().reverse().forEach(layer => {
                const layerItem = this.createLayerItem(layer);
                this.layersList.appendChild(layerItem);
            });
        }
        
        // Update scroll indicators after layer changes
        setTimeout(() => this.updateScrollIndicators(), 50);
    }
    
    createLayerItem(layer) {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.id = `layer-item-${layer.id}`;
        
        const name = document.createElement('div');
        name.className = 'layer-name';
        name.textContent = layer.name;
        
        const controls = document.createElement('div');
        controls.className = 'layer-controls';
        
        // Visibility toggle
        const visibilityBtn = document.createElement('button');
        visibilityBtn.className = 'layer-btn';
        visibilityBtn.innerHTML = layer.visible ? '👁️' : '🙈';
        visibilityBtn.title = layer.visible ? 'Hide layer' : 'Show layer';
        visibilityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(layer);
        });
        
        // Move up button
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'layer-btn';
        moveUpBtn.innerHTML = '⬆️';
        moveUpBtn.title = 'Move layer up';
        moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.moveLayerUp(layer);
        });
        
        // Move down button
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'layer-btn';
        moveDownBtn.innerHTML = '⬇️';
        moveDownBtn.title = 'Move layer down';
        moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.moveLayerDown(layer);
        });
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'layer-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete layer';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteLayer(layer);
        });
        
        controls.appendChild(visibilityBtn);
        controls.appendChild(moveUpBtn);
        controls.appendChild(moveDownBtn);
        controls.appendChild(deleteBtn);
        
        item.appendChild(name);
        item.appendChild(controls);
        
        // Click to select layer
        item.addEventListener('click', () => {
            this.setActiveLayer(layer);
        });
        
        return item;
    }
    
    toggleLayerVisibility(layer) {
        layer.visible = !layer.visible;
        layer.element.style.display = layer.visible ? 'block' : 'none';
        this.updateLayersDisplay();
    }
    
    moveLayerUp(layer) {
        const index = this.layers.indexOf(layer);
        if (index < this.layers.length - 1) {
            // Swap with next layer
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            
            // Update z-index
            layer.element.style.zIndex = (index + 1) * 10;
            this.layers[index].element.style.zIndex = index * 10;
            
            this.updateLayersDisplay();
        }
    }
    
    moveLayerDown(layer) {
        const index = this.layers.indexOf(layer);
        if (index > 0) {
            // Swap with previous layer
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
            
            // Update z-index
            layer.element.style.zIndex = (index - 1) * 10;
            this.layers[index].element.style.zIndex = index * 10;
            
            this.updateLayersDisplay();
        }
    }
    
    deleteLayer(layer) {
        const index = this.layers.indexOf(layer);
        if (index !== -1) {
            // Remove from DOM
            layer.element.remove();
            
            // Remove from layers array
            this.layers.splice(index, 1);
            
            // Clear active layer if it was the deleted one
            if (this.activeLayer === layer) {
                this.activeLayer = null;
            }
            
            this.updateLayersDisplay();
            this.showNotification(`Deleted layer: ${layer.name}`, 'success');
        }
    }
    
    resetCanvas() {
        // Clear all layers
        this.layers.forEach(layer => {
            layer.element.remove();
        });
        
        this.layers = [];
        this.activeLayer = null;
        this.layerCounter = 0;
        
        // Reset background color to white
        this.changeBackgroundColor('#ffffff', false);
        if (this.backgroundColorPicker) {
            this.backgroundColorPicker.value = '#ffffff';
        }
        
        // Update layers display
        this.updateLayersDisplay();
        
        // Show reset confirmation (this will show since it's a success message)
        this.showNotification('Canvas reset successfully', 'success');
    }
    
    async exportFSJAL() {
        try {
            // Store original border style
            const originalBorder = this.canvas.style.border;
            const originalBorderRadius = this.canvas.style.borderRadius;
            
            // Temporarily remove border for export
            this.canvas.style.border = 'none';
            this.canvas.style.borderRadius = '0';
            
            // Hide all UI elements during export
            const uiElements = this.canvas.querySelectorAll('.resize-handle, .rotate-handle');
            const draggableLayers = this.canvas.querySelectorAll('.draggable-layer');
            const layerImages = this.canvas.querySelectorAll('.draggable-layer img');
            
            // Store original styles and states
            const originalBorders = [];
            const originalClasses = [];
            const originalCursors = [];
            const originalImageStyles = [];
            
            // Hide UI elements
            uiElements.forEach(el => el.style.display = 'none');
            
            // Fix image dimensions before changing container properties
            layerImages.forEach((img, index) => {
                const computedStyle = window.getComputedStyle(img);
                originalImageStyles[index] = {
                    width: img.style.width,
                    height: img.style.height
                };
                
                // Set explicit pixel dimensions to prevent scaling issues
                img.style.width = computedStyle.width;
                img.style.height = computedStyle.height;
            });
            
            // Temporarily remove all interactive styles from draggable layers
            draggableLayers.forEach((el, index) => {
                originalBorders[index] = el.style.border;
                originalClasses[index] = el.className;
                originalCursors[index] = el.style.cursor;
                
                // Reset to transparent border to maintain box model dimensions
                el.style.border = '2px solid transparent';
                el.style.cursor = 'default';
                el.classList.remove('active', 'resizing', 'rotating');
            });
            
            // Deactivate current layer temporarily
            const wasActiveLayer = this.activeLayer;
            this.activeLayer = null;
            
            // Add export mode class for additional style overrides
            this.canvas.classList.add('export-mode');
            
            // Wait a bit for styling to update
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Use html2canvas to capture the canvas with better options
            const canvas = await html2canvas(this.canvas, {
                backgroundColor: this.currentBackgroundColor,
                scale: 2, // Higher quality
                logging: false,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false, // Disable this as it can cause issues
                imageTimeout: 15000, // Increase timeout
                removeContainer: false,
                width: this.canvas.offsetWidth,
                height: this.canvas.offsetHeight,
                scrollX: 0,
                scrollY: 0
            });
            
            // Restore original border style
            this.canvas.style.border = originalBorder;
            this.canvas.style.borderRadius = originalBorderRadius;
            
            // Show UI elements again
            uiElements.forEach(el => el.style.display = '');
            
            // Restore original image styles
            layerImages.forEach((img, index) => {
                if (originalImageStyles[index]) {
                    img.style.width = originalImageStyles[index].width || '';
                    img.style.height = originalImageStyles[index].height || '';
                }
            });
            
            // Restore all original styles to draggable layers
            draggableLayers.forEach((el, index) => {
                el.style.border = originalBorders[index] || '';
                el.className = originalClasses[index] || '';
                el.style.cursor = originalCursors[index] || '';
            });
            
            // Restore active layer
            this.activeLayer = wasActiveLayer;
            
            // Remove export mode class
            this.canvas.classList.remove('export-mode');
            
            // Handle mobile and desktop export differently
            const dataUrl = canvas.toDataURL('image/png');
            
            if (this.isMobile()) {
                // Mobile: Open image in new tab for manual save
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.document.write(`
                        <html>
                            <head>
                                <title>Your FSJAL - Save Image</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                    body { 
                                        margin: 0; 
                                        padding: 20px; 
                                        background: #f0f0f0; 
                                        font-family: 'Patrick Hand SC', cursive; 
                                        text-align: center;
                                    }
                                    .instructions { 
                                        margin-bottom: 20px; 
                                        padding: 15px; 
                                        background: white; 
                                        border-radius: 10px; 
                                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                    }
                                    img { 
                                        max-width: 100%; 
                                        height: auto; 
                                        border-radius: 10px; 
                                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                                    }
                                    .tip { 
                                        margin-top: 15px; 
                                        color: #666; 
                                        font-size: 14px; 
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="instructions">
                                    <h2>📱 Your FSJAL is Ready!</h2>
                                    <p><strong>To save:</strong> Long-press the image below and select "Save Image" or "Add to Photos"</p>
                                </div>
                                <img src="${dataUrl}" alt="Your FSJAL">
                                <div class="tip">
                                    💡 On iPhone: Long-press → "Add to Photos"<br>
                                    💡 On Android: Long-press → "Save image"
                                </div>
                            </body>
                        </html>
                    `);
                    newWindow.document.close();
                    this.showNotification('FSJAL opened in new tab! Long-press to save.', 'success');
                } else {
                    // Fallback if popup is blocked
                    this.showMobileImageModal(dataUrl);
                }
            } else {
                // Desktop: Use traditional download
                const link = document.createElement('a');
                link.download = `fsjal-${Date.now()}.png`;
                link.href = dataUrl;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('FSJAL exported successfully!', 'success');
            }
        } catch (error) {
            this.showNotification('Export failed. Please try again.', 'error');
            // Restore border even if export fails
            this.canvas.style.border = '';
            this.canvas.style.borderRadius = '';
            // Show UI elements again even if export fails
            const uiElements = this.canvas.querySelectorAll('.resize-handle, .rotate-handle');
            const draggableLayers = this.canvas.querySelectorAll('.draggable-layer');
            const layerImages = this.canvas.querySelectorAll('.draggable-layer img');
            
            uiElements.forEach(el => el.style.display = '');
            
            // Restore default image styles
            layerImages.forEach(img => {
                img.style.width = '100%';
                img.style.height = '100%';
            });
            
            draggableLayers.forEach(el => {
                el.style.border = '2px dashed transparent';
                el.style.cursor = '';
                el.classList.remove('active', 'resizing', 'rotating');
            });
            
            // Remove export mode class even if export fails
            this.canvas.classList.remove('export-mode');
        }
    }
    
    showMobileImageModal(dataUrl) {
        // Create mobile-friendly export modal
        const modal = document.createElement('div');
        modal.className = 'mobile-export-modal';
        modal.innerHTML = `
            <div class="mobile-export-backdrop"></div>
            <div class="mobile-export-content">
                <div class="mobile-export-header">
                    <h3>📱 Your FSJAL is Ready!</h3>
                    <button class="mobile-export-close" aria-label="Close">×</button>
                </div>
                <div class="mobile-export-body">
                    <p><strong>To save:</strong> Long-press the image below and select "Save Image" or "Add to Photos"</p>
                    <img src="${dataUrl}" alt="Your FSJAL" class="mobile-export-image">
                    <div class="mobile-export-tip">
                        💡 On iPhone: Long-press → "Add to Photos"<br>
                        💡 On Android: Long-press → "Save image"
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .mobile-export-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }
            
            .mobile-export-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
            }
            
            .mobile-export-content {
                position: relative;
                background: white;
                border-radius: 15px;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-export-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .mobile-export-header h3 {
                margin: 0;
                font-family: 'Patrick Hand SC', cursive;
                font-size: 20px;
                color: #000;
            }
            
            .mobile-export-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 5px;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .mobile-export-close:hover {
                background: #f0f0f0;
            }
            
            .mobile-export-body {
                padding: 20px;
                text-align: center;
                font-family: 'Patrick Hand SC', cursive;
            }
            
            .mobile-export-image {
                max-width: 100%;
                height: auto;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                margin: 15px 0;
            }
            
            .mobile-export-tip {
                margin-top: 15px;
                color: #666;
                font-size: 14px;
                line-height: 1.4;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Close handlers
        const closeModal = () => {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        };
        
        modal.querySelector('.mobile-export-close').addEventListener('click', closeModal);
        modal.querySelector('.mobile-export-backdrop').addEventListener('click', closeModal);
        
        this.showNotification('Long-press the image to save!', 'success');
    }
    
    openUploadModal() {
        const modal = document.getElementById('upload-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus on first input
        const firstInput = modal.querySelector('input[type="file"]');
        if (firstInput) {
            firstInput.focus();
        }
    }
    
    closeUploadModal() {
        const modal = document.getElementById('upload-modal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        
        // Reset form
        const form = document.getElementById('upload-form');
        form.reset();
        
        // Hide preview
        const preview = document.getElementById('file-preview');
        preview.classList.remove('active');
        preview.innerHTML = '';
        
        // Reset file input display
        const display = document.getElementById('file-input-display');
        display.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Click to choose file</span>
        `;
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('File size must be less than 5MB', 'error');
            return;
        }
        
        // Update file input display
        const display = document.getElementById('file-input-display');
        display.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>${file.name}</span>
        `;
        
        // Show preview
        const preview = document.getElementById('file-preview');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.classList.add('active');
        };
        
        reader.readAsDataURL(file);
        
        // Auto-fill asset name
        const assetName = document.getElementById('asset-name');
        if (!assetName.value) {
            assetName.value = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        }
    }
    
    handleUpload(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('file-input');
        const assetName = document.getElementById('asset-name');
        const assetCategory = document.getElementById('asset-category');
        
        if (!fileInput.files[0]) {
            this.showNotification('Please select a file', 'error');
            return;
        }
        
        if (!assetName.value.trim()) {
            this.showNotification('Please enter an asset name', 'error');
            return;
        }
        
        // Create asset object
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const asset = {
                id: Date.now().toString(),
                name: assetName.value.trim(),
                category: assetCategory.value,
                url: e.target.result,
                timestamp: Date.now()
            };
            
            // Save asset
            this.saveAssetSafe(asset);
            
            // Reload assets for the category
            this.loadCategoryAssets(asset.category);
            
            // Close modal
            this.closeUploadModal();
            
            this.showNotification(`Asset "${asset.name}" uploaded successfully!`, 'success');
        };
        
        reader.readAsDataURL(file);
    }
    
    saveAssetSafe(asset) {
        try {
            const category = asset.category;
            const existingAssets = this.getStoredAssetsSafe(category);
            existingAssets.push(asset);
            localStorage.setItem(`fsjal_assets_${category}`, JSON.stringify(existingAssets));
        } catch (error) {
            this.showNotification('Failed to save asset', 'error');
        }
    }
    
    getStoredAssetsSafe(category) {
        try {
            const stored = localStorage.getItem(`fsjal_assets_${category}`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }
    
    loadStoredAssets() {
        const categories = ['hat', 'hands', 'hair', 'accessories'];
        categories.forEach(category => {
            this.loadCategoryAssets(category);
        });
    }
    
    handleKeyDown(e) {
        // Delete key - delete active layer
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.activeLayer && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                this.deleteLayer(this.activeLayer);
            }
        }
        
        // Escape key - deselect active layer
        if (e.key === 'Escape') {
            this.setActiveLayer(null);
        }
        
        // Ctrl+Z - Reset canvas (since we don't have proper undo)
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.resetCanvas();
        }
        
        // Ctrl+E - Export
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            this.exportFSJAL();
        }
        
        // Arrow keys - move active layer
        if (this.activeLayer && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const element = this.activeLayer.element;
            const currentLeft = parseInt(element.style.left) || 0;
            const currentTop = parseInt(element.style.top) || 0;
            
            switch (e.key) {
                case 'ArrowUp':
                    element.style.top = `${currentTop - step}px`;
                    break;
                case 'ArrowDown':
                    element.style.top = `${currentTop + step}px`;
                    break;
                case 'ArrowLeft':
                    element.style.left = `${currentLeft - step}px`;
                    break;
                case 'ArrowRight':
                    element.style.left = `${currentLeft + step}px`;
                    break;
            }
            element.style.transform = 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        // Show error notifications, export success, reset confirmations, and mobile tips
        if (type === 'error' || 
            message.includes('exported successfully') || 
            message.includes('reset successfully') || 
            message.includes('Long-press') || 
            message.includes('opened in new tab') || 
            message.includes('Tip:')) {
            
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            this.notifications.appendChild(notification);
            
            // Auto-remove after different times based on message type
            const timeout = message.includes('Tip:') ? 5000 : 3000;
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, timeout);
        }
        // For all other notifications, suppress logging in production
        // (Previously logged to console for debugging)
    }
    
    destroy() {
        // Clean up event listeners and observers
        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
        }
        
        // Remove global event listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('resize', this.handleWindowResize);
        
        // Clear timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }
}

// Initialize the FSJAL Generator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fsjalGenerator = new FSJALGenerator();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.fsjalGenerator) {
        window.fsjalGenerator.destroy();
    }
});

// Add some CSS for drag states
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .canvas.drag-over {
            border-color: var(--color-primary);
            background-color: var(--color-primary-light);
        }
        
        .asset-item[draggable="true"] {
            cursor: grab;
        }
        
        .asset-item[draggable="true"]:active {
            cursor: grabbing;
        }
    `;
    document.head.appendChild(style);
}); 
