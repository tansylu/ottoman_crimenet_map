// Beyoglu Map Overlay System
// Handles coordinate transformation between image pixels and geographic coordinates

class BeyogluMapOverlay {
    constructor() {
        this.modernMap = null;
        this.imageElement = null;
        this.mapContainer = null;
        this.overlayCanvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.currentRotation = 0;
        
        // Control points for coordinate transformation
        this.controlPoints = {
            image: [
                [100, 100],  // Top-left control point in image coordinates
                [500, 400]   // Bottom-right control point in image coordinates
            ],
            geographic: [
                [41.0082, 28.9784],  // Top-left control point in geographic coordinates
                [41.0582, 29.0284]   // Bottom-right control point in geographic coordinates
            ]
        };
        
        this.transformMatrix = null;
        this.initialBounds = null;
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupOverlay();
            });
        } else {
            this.setupOverlay();
        }
    }
    
    setupOverlay() {
        // Find the beyoglu map image
        this.imageElement = document.querySelector('.historical-map');
        if (!this.imageElement) {
            console.warn('Beyoglu map image not found');
            return;
        }
        
        this.mapContainer = this.imageElement.parentElement;
        if (!this.mapContainer) {
            console.warn('Map container not found');
            return;
        }
        
        // Preprocess the map image before initializing
        this.preprocessMapImage();
        
        // Initialize modern map
        this.initializeModernMap();
        
        // Create overlay canvas
        this.createOverlayCanvas();
        
        // Calculate transformation matrix
        this.calculateTransformationMatrix();
        
        // Add event listeners
        this.addEventListeners();
        
        // Setup opacity controls
        this.setupOpacityControls();
        
        // Setup alignment controls
        this.setupAlignmentControls();
        
        // Apply saved configuration immediately
        this.applySavedConfiguration();
        
        this.isInitialized = true;
        console.log('Beyoglu map overlay initialized');
    }
    
    preprocessMapImage() {
        // This will be called after the modern map is initialized
        // We'll preprocess the satellite map tiles to have the correct rotation
        console.log('Satellite map will be preprocessed after initialization');
    }
    
    initializeModernMap() {
        const modernMapContainer = document.getElementById('modern-map');
        if (!modernMapContainer) {
            console.warn('Modern map container not found');
            return;
        }
        
        // Initialize Leaflet map
        this.modernMap = L.map('modern-map', {
            zoomControl: true,
            attributionControl: false,
            dragging: true,  // Disable dragging since we don't have controls
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false
        });
        
        // Add satellite tile layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(this.modernMap);
        
        // Store the initial bounds for reference
        const europeanIstanbulCenter = [41.0082, 28.9784];
        this.initialBounds = L.latLngBounds([
            [40.85, 28.65],  // Southwest bounds (southern European Istanbul)
            [41.15, 29.15]   // Northeast bounds (northern European Istanbul)
        ]);
        
        console.log('Modern map initialized');
        
        // Preprocess the satellite map after it's loaded
        this.modernMap.whenReady(() => {
            this.preprocessSatelliteMap();
        });
    }
    
    preprocessSatelliteMap() {
        // Get the map container
        const mapContainer = this.modernMap.getContainer();
        
        // Apply the rotation directly to the map container
        mapContainer.style.transform = 'rotate(92deg)';
        mapContainer.style.transformOrigin = 'center center';
        
        // Calculate the expansion needed for 92 degree rotation
        const rotationRad = (92 * Math.PI) / 180;
        const expansionFactor = Math.abs(Math.cos(rotationRad)) + Math.abs(Math.sin(rotationRad));
        
        // Adjust the container size to accommodate the rotated map
        const originalWidth = mapContainer.offsetWidth;
        const originalHeight = mapContainer.offsetHeight;
        
        mapContainer.style.width = (originalWidth * expansionFactor) + 'px';
        mapContainer.style.height = (originalHeight * expansionFactor) + 'px';
        
        // Force the map to update its size
        this.modernMap.invalidateSize();
        
        console.log('Satellite map preprocessed with rotation and expansion');
    }
    
    setupOpacityControls() {
        const opacitySlider = document.getElementById('opacity-slider');
        const opacityValue = document.getElementById('opacity-value');
        
        if (!opacitySlider || !opacityValue) {
            console.warn('Opacity controls not found');
            return;
        }
        
        // Set initial opacity
        const initialOpacity = opacitySlider.value / 100;
        this.imageElement.style.opacity = initialOpacity;
        
        // Add event listener
        opacitySlider.addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            this.imageElement.style.opacity = opacity;
            opacityValue.textContent = e.target.value + '%';
        });
        
        console.log('Opacity controls initialized');
    }
    
    applySavedConfiguration() {
        // Calculate the new perfect center based on movements
        // Starting from: [41.030485107096936, 28.978446722030643]
        // Movements: Up 100m (2x50m), Left 50m
        
        const startLat = 41.030485107096936;
        const startLng = 28.978446722030643;
        
        // Convert meters to degrees
        const latOffset = 100 / 111000; // 100 meters up in degrees of latitude
        const lngOffset = 50 / (111000 * Math.cos(startLat * Math.PI / 180)); // 50 meters left in degrees of longitude
        
        const perfectCenter = [startLat + latOffset, startLng - lngOffset]; // Up and left
        
        this.modernMap.setView(perfectCenter, 16); // Zoom level 16
        // No need to rotate since satellite map is preprocessed
        
        this.imageElement.style.opacity = 0.8;
        console.log('Applied new perfect configuration at:', perfectCenter);
        
        // Save this new position
        localStorage.setItem('beyogluPerfectCenter', JSON.stringify(perfectCenter));
        console.log('Saved new perfect center to localStorage');
    }
    
    // Method to get current center position for debugging
    getCurrentCenter() {
        if (this.modernMap) {
            const center = this.modernMap.getCenter();
            console.log('Current map center:', [center.lat, center.lng]);
            return [center.lat, center.lng];
        }
        return null;
    }
    
    // Method to set the current position as the new perfect center
    setCurrentAsPerfectCenter() {
        if (this.modernMap) {
            const center = this.modernMap.getCenter();
            const newPerfectCenter = [center.lat, center.lng];
            console.log('Setting new perfect center:', newPerfectCenter);
            
            // Update the applySavedConfiguration method to use this new center
            this.perfectCenter = newPerfectCenter;
            
            // Save to localStorage for persistence
            localStorage.setItem('beyogluPerfectCenter', JSON.stringify(newPerfectCenter));
            
            return newPerfectCenter;
        }
        return null;
    }
    
    getSavedPosition() {
        const saved = localStorage.getItem('beyogluMapPosition');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved position:', e);
                return null;
            }
        }
        return null;
    }
    
    createOverlayCanvas() {
        // Create canvas element
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.zIndex = '10';
        
        // Set canvas size to match image
        this.overlayCanvas.width = this.imageElement.offsetWidth;
        this.overlayCanvas.height = this.imageElement.offsetHeight;
        
        // Get 2D context
        this.ctx = this.overlayCanvas.getContext('2d');
        
        // Add canvas to container
        this.mapContainer.style.position = 'relative';
        this.mapContainer.appendChild(this.overlayCanvas);
        
        // Handle image resize
        this.handleImageResize();
    }
    
    handleImageResize() {
        const resizeObserver = new ResizeObserver(() => {
            if (this.imageElement && this.overlayCanvas) {
                this.overlayCanvas.width = this.imageElement.offsetWidth;
                this.overlayCanvas.height = this.imageElement.offsetHeight;
                this.redrawOverlay();
            }
        });
        
        resizeObserver.observe(this.imageElement);
    }
    
    calculateTransformationMatrix() {
        // Use the actual control points to calculate the transformation
        const imgPoint1 = this.controlPoints.image[0];
        const imgPoint2 = this.controlPoints.image[1];
        const geoPoint1 = this.controlPoints.geographic[0];
        const geoPoint2 = this.controlPoints.geographic[1];
        
        // Calculate differences
        const imgDeltaX = imgPoint2[0] - imgPoint1[0];
        const imgDeltaY = imgPoint2[1] - imgPoint1[1];
        const geoDeltaLat = geoPoint2[0] - geoPoint1[0];
        const geoDeltaLng = geoPoint2[1] - geoPoint1[1];
        
        // Calculate scale factors (pixels per degree)
        const scaleX = imgDeltaX / geoDeltaLng;
        const scaleY = imgDeltaY / geoDeltaLat;
        
        // Calculate offsets
        const offsetX = imgPoint1[0] - (geoPoint1[1] * scaleX);
        const offsetY = imgPoint1[1] - (geoPoint1[0] * scaleY);
        
        this.transformMatrix = {
            scaleX: scaleX,
            scaleY: scaleY,
            offsetX: offsetX,
            offsetY: offsetY
        };
        
        console.log('Transformation matrix calculated:', this.transformMatrix);
    }
    
    geographicToImage(lat, lng) {
        if (!this.transformMatrix) return null;
        
        const x = (lng * this.transformMatrix.scaleX) + this.transformMatrix.offsetX;
        const y = (lat * this.transformMatrix.scaleY) + this.transformMatrix.offsetY;
        
        return [x, y];
    }
    
    imageToGeographic(x, y) {
        if (!this.transformMatrix) return null;
        
        const lng = (x - this.transformMatrix.offsetX) / this.transformMatrix.scaleX;
        const lat = (y - this.transformMatrix.offsetY) / this.transformMatrix.scaleY;
        
        return [lat, lng];
    }
    
    drawGeographicLine(lat1, lng1, lat2, lng2, options = {}) {
        const point1 = this.geographicToImage(lat1, lng1);
        const point2 = this.geographicToImage(lat2, lng2);
        
        if (point1 && point2) {
            this.ctx.beginPath();
            this.ctx.moveTo(point1[0], point1[1]);
            this.ctx.lineTo(point2[0], point2[1]);
            this.ctx.strokeStyle = options.color || '#ff0000';
            this.ctx.lineWidth = options.width || 2;
            this.ctx.stroke();
        }
    }
    
    drawPoint(x, y, color = '#ff0000', size = 6) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
    
    clearOverlay() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }
    
    redrawOverlay() {
        this.clearOverlay();
        // Add any persistent overlay elements here
    }
    
    addEventListeners() {
        // Add any necessary event listeners here
        // For now, we don't need any since we removed the controls
    }
    
    setupAlignmentControls() {
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const resetBtn = document.getElementById('reset-view');
        const rotateLeftBtn = document.getElementById('rotate-left');
        const rotateRightBtn = document.getElementById('rotate-right');
        const rotationInput = document.getElementById('rotation-input');
        
        if (!this.modernMap) {
            console.warn('Modern map not initialized');
            return;
        }
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.zoomMap('in');
                console.log('Zoomed in');
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.zoomMap('out');
                console.log('Zoomed out');
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetMapView();
                console.log('Reset view');
            });
        }
        
        if (rotateLeftBtn) {
            rotateLeftBtn.addEventListener('click', () => {
                this.rotateMap(-45);
                console.log('Rotated left');
            });
        }
        
        if (rotateRightBtn) {
            rotateRightBtn.addEventListener('click', () => {
                this.rotateMap(45);
                console.log('Rotated right');
            });
        }
        
        if (rotationInput) {
            rotationInput.addEventListener('input', (e) => {
                const rotation = parseFloat(e.target.value) || 0;
                this.rotateMapTo(rotation);
                console.log('Rotated to:', rotation);
            });
        }
        
        // Setup movement controls
        this.setupMovementControls();
        
        console.log('Alignment controls initialized');
    }
    
    setupMovementControls() {
        const moveUpBtn = document.getElementById('move-up');
        const moveDownBtn = document.getElementById('move-down');
        const moveLeftBtn = document.getElementById('move-left');
        const moveRightBtn = document.getElementById('move-right');
        
        if (!this.modernMap) {
            console.warn('Modern map not initialized');
            return;
        }
        
        if (moveUpBtn) {
            moveUpBtn.addEventListener('click', () => {
                this.moveMap('up');
                console.log('Moved up 50m');
            });
        }
        
        if (moveDownBtn) {
            moveDownBtn.addEventListener('click', () => {
                this.moveMap('down');
                console.log('Moved down 50m');
            });
        }
        
        if (moveLeftBtn) {
            moveLeftBtn.addEventListener('click', () => {
                this.moveMap('left');
                console.log('Moved left 50m');
            });
        }
        
        if (moveRightBtn) {
            moveRightBtn.addEventListener('click', () => {
                this.moveMap('right');
                console.log('Moved right 50m');
            });
        }
        
        console.log('Movement controls initialized');
    }
    
    moveMap(direction) {
        if (!this.modernMap) return;
        
        const currentCenter = this.modernMap.getCenter();
        const currentLat = currentCenter.lat;
        const currentLng = currentCenter.lng;
        
        // Convert 50 meters to degrees (approximate)
        // At this latitude, 1 degree of latitude ≈ 111,000 meters
        // 1 degree of longitude ≈ 111,000 * cos(latitude) meters
        const latOffset = 50 / 111000; // 50 meters in degrees of latitude
        const lngOffset = 50 / (111000 * Math.cos(currentLat * Math.PI / 180)); // 50 meters in degrees of longitude
        
        let newLat = currentLat;
        let newLng = currentLng;
        
        switch (direction) {
            case 'up':
                newLat = currentLat + latOffset;
                break;
            case 'down':
                newLat = currentLat - latOffset;
                break;
            case 'left':
                newLng = currentLng - lngOffset;
                break;
            case 'right':
                newLng = currentLng + lngOffset;
                break;
        }
        
        // Move the map to the new position
        this.modernMap.setView([newLat, newLng], this.modernMap.getZoom(), { animate: true });
    }
    
    zoomMap(direction) {
        if (!this.modernMap) return;
        
        const currentCenter = this.modernMap.getCenter();
        const currentZoom = this.modernMap.getZoom();
        
        if (direction === 'in') {
            // Zoom in - increase zoom level while keeping exact center
            const newZoom = Math.min(currentZoom + 1, 18); // Limit max zoom
            this.modernMap.setView(currentCenter, newZoom, { animate: false });
            
        } else if (direction === 'out') {
            // Zoom out - decrease zoom level while keeping exact center
            const newZoom = Math.max(currentZoom - 1, 1); // Limit min zoom
            this.modernMap.setView(currentCenter, newZoom, { animate: false });
        }
    }
    
    resetMapView() {
        if (!this.modernMap) return;
        
        // Reset to European Istanbul view
        const europeanIstanbulCenter = [41.0082, 28.9784];
        
        // Reset to initial view covering entire European Istanbul
        this.modernMap.setView(europeanIstanbulCenter, 10);
        
        // Reset rotation
        this.rotateMapTo(0);
        
        // Update rotation input
        const rotationInput = document.getElementById('rotation-input');
        if (rotationInput) {
            rotationInput.value = 0;
        }
    }
    
    rotateMap(degrees) {
        if (!this.modernMap) return;
        
        // Calculate new rotation
        const newRotation = this.currentRotation + degrees;
        this.rotateMapTo(newRotation);
    }
    
    rotateMapTo(degrees) {
        if (!this.modernMap) return;
        
        this.currentRotation = degrees;
        
        // Apply rotation using CSS transform
        const mapContainer = this.modernMap.getContainer();
        mapContainer.style.transform = `rotate(${degrees}deg)`;
        mapContainer.classList.add('rotated');
        
        // Update the rotation input
        const rotationInput = document.getElementById('rotation-input');
        if (rotationInput) {
            rotationInput.value = degrees;
        }
        
        console.log(`Map rotated to ${degrees} degrees`);
    }
}

// Initialize the overlay when the script loads
const beyogluOverlay = new BeyogluMapOverlay();
beyogluOverlay.init(); 