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

    // Handle window resize for responsive behavior
    let resizeTimeout;
    window.addEventListener('resize', function() {
        // Debounce resize event to prevent excessive reloading
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Refresh the map to adjust to new size
            map.invalidateSize();

            // If we need to completely reload the page for major layout changes
            // Uncomment the following line
            // window.location.reload();
        }, 250);
    });

    // Add keyboard shortcuts for year navigation
    document.addEventListener('keydown', function(event) {
        // Left arrow key - previous year
        if (event.key === 'ArrowLeft') {
            goToPreviousYear();
        }
        // Right arrow key - next year
        else if (event.key === 'ArrowRight') {
            goToNextYear();
        }
        // Space key - toggle play/pause
        else if (event.key === ' ' || event.key === 'Spacebar') {
            togglePlayPause();
            event.preventDefault(); // Prevent page scrolling on space
        }
    });
});
