// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    // Get Firebase config from the server
    const firebaseConfig = JSON.parse(document.getElementById('firebase-config').textContent);
    
    // Initialize Firebase
    initFirebase(firebaseConfig);
    
    // Initialize map
    initMap();
    
    // Initialize time slider
    initTimeSlider();
    
    // Initialize criminal modal
    initCriminalModal();
    
    // Initialize Ottoman borders
    initBorders();
    
    // Fetch markers
    fetchMarkers();
});
