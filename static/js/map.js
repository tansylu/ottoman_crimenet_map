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
    // Initialize the map - centered on Ottoman Empire's approximate center
    map = L.map('map').setView([39.5, 35], 5);
    initialView = {center: [39.5, 35], zoom: 5};

    // Add a base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
