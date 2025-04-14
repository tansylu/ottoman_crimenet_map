// Global variables for map functionality
let map;
let initialView;
let allMarkers = [];
let visibleMarkers = [];
let markerData = {};

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
    // Remove all currently visible markers
    visibleMarkers.forEach(marker => map.removeLayer(marker));
    visibleMarkers = [];

    // Add markers for the current year
    allMarkers.forEach(marker => {
        const data = marker.documentData;
        if (data.date && data.date.year === currentYear) {
            map.addLayer(marker);
            visibleMarkers.push(marker);
        }
    });
}
