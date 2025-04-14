// Global variables for map functionality
let map;
let initialView;
let allMarkers = [];
let visibleMarkers = [];
let markerData = {};
let markerClusterGroup; // Cluster group for markers

// Initialize Firebase and Firestore
let db;

// Initialize the map
function initMap() {
    // Set initial zoom level based on screen size
    let initialZoom = 6; // Closer zoom for desktop
    if (window.innerWidth <= 768) {
        initialZoom = 5; // Slightly zoomed out for tablets
    }
    if (window.innerWidth <= 480) {
        initialZoom = 4; // More zoomed out for phones
    }

    // Initialize the map - centered closer to Istanbul while still showing a large area
    const istanbulArea = [41.0, 29.0]; // Istanbul coordinates
    map = L.map('map', {
        zoomControl: false, // We'll add zoom control in a better position for mobile
        attributionControl: false // We'll add attribution in a better way
    }).setView(istanbulArea, initialZoom);

    initialView = {center: istanbulArea, zoom: initialZoom};

    // Add a base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add zoom control to top-right (better for mobile)
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Add attribution control to bottom-right
    L.control.attribution({
        position: 'bottomright'
    }).addTo(map);

    // Initialize the marker cluster group with custom options
    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false, // Don't show the area covered by the cluster
        maxClusterRadius: 60, // Larger radius means more aggressive clustering
        spiderfyOnMaxZoom: true, // Allow clicking on a cluster at max zoom to spread out its markers
        zoomToBoundsOnClick: true, // Zoom when a cluster is clicked
        iconCreateFunction: function(cluster) {
            // Count markers in the cluster
            const count = cluster.getChildCount();

            // Determine size based on count
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';

            // Create custom cluster icon with count
            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(46, 46)
            });
        },
        // Animate clusters when zooming
        animate: true,
        animateAddingMarkers: true,
        disableClusteringAtZoom: 15 // Disable clustering at very high zoom levels
    });

    // Add the cluster group to the map
    map.addLayer(markerClusterGroup);

    // Reset view button functionality
    document.getElementById('reset-view').addEventListener('click', function() {
        map.setView(initialView.center, initialView.zoom);
        timeSlider.noUiSlider.set(START_YEAR);
    });
}

// Initialize Firebase
function initFirebase(firebaseConfig) {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

// Update markers based on current year
function updateMarkers() {
    // Clear the cluster group
    markerClusterGroup.clearLayers();
    visibleMarkers = [];

    // Add markers for the current year to the cluster group
    allMarkers.forEach(marker => {
        const data = marker.documentData;
        if (data.date && data.date.year === currentYear) {
            markerClusterGroup.addLayer(marker);
            visibleMarkers.push(marker);
        }
    });

    // Log the number of visible markers for the current year
    console.log(`Showing ${visibleMarkers.length} markers for year ${currentYear}`);
}
