// Ottoman Crime Network Map - Main Initialization Module for Landing Page

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - initializing landing page");

    // Get Firebase config from the server
    const firebaseConfigElement = document.getElementById('firebase-config');
    if (!firebaseConfigElement) {
        console.error("Firebase config element not found");
        return;
    }

    try {
        const firebaseConfig = JSON.parse(firebaseConfigElement.textContent);
        console.log("Firebase config loaded successfully");

        // Initialize Firebase
        if (!firebase) {
            console.error("Firebase library not loaded");
            return;
        }

        const app = firebase.initializeApp(firebaseConfig);
        const db = app.firestore();

        // Store db in a global variable for access by other scripts
        window.db = db;

        console.log("Firebase initialized successfully");

        // Initialize the criminals map for the mobility map section
        // Make sure the map is properly sized within its container
        const criminalsMapContainer = document.querySelector('.criminal-journeys-container');
        if (!criminalsMapContainer) {
            console.error("Criminal journeys container not found");
            return;
        }

        // Ensure the map container is visible before initializing the map
        criminalsMapContainer.style.display = 'block';

        // Check if the map element exists
        const mapElement = document.getElementById('criminals-map');
        if (!mapElement) {
            console.error("Criminals map element not found");
            return;
        }

        console.log("Initializing Leaflet map");
        const criminalsMap = L.map('criminals-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([41.0, 29.0], 6);

        // Store the map in a global variable for access by other scripts
        window.criminalsMapInstance = criminalsMap;
        console.log("Map initialized and stored in global variable");

        // Initialize fullscreen functionality after map is created
        if (typeof initFullscreenToggle === 'function') {
            initFullscreenToggle(criminalsMap);
            console.log("Fullscreen toggle initialized");
        } else {
            console.warn("initFullscreenToggle function not found");
        }

        // Add tile layer to the criminals map
        const tileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        L.tileLayer(tileLayer, {
            attribution: attribution,
            maxZoom: 19,
            className: 'historical-map-tiles'
        }).addTo(criminalsMap);
        console.log("Tile layer added to map");

        // Add zoom control to the criminals map
        L.control.zoom({
            position: 'topright'
        }).addTo(criminalsMap);
        console.log("Zoom control added to map");

        // Initialize Ottoman borders for the criminals map (without toggle button)
        if (typeof initBorders === 'function') {
            initBorders(criminalsMap);
            console.log("Ottoman borders initialized");
        } else {
            console.warn("initBorders function not found");
        }

        // Initialize criminal modal
        if (typeof initCriminalModal === 'function') {
            initCriminalModal();
            console.log("Criminal modal initialized");
        } else {
            console.warn("initCriminalModal function not found");
        }

        // Fetch criminals for the criminals map with a slight delay to ensure everything is initialized
        if (typeof fetchCriminals === 'function') {
            console.log("Scheduling fetchCriminals call");
            setTimeout(function() {
                console.log("Calling fetchCriminals now");
                fetchCriminals(db, criminalsMap);
            }, 1000); // Increased delay to 1 second for better initialization
        } else {
            console.error("fetchCriminals function not found");
        }

        // Handle window resize for the criminals map
        window.addEventListener('resize', function() {
            // Invalidate the map size to ensure it renders correctly after resize
            criminalsMap.invalidateSize();
            console.log("Map size invalidated after resize");

            // Ensure the map container is properly sized
            const criminalsMapContainer = document.querySelector('.criminal-journeys-container');
            if (criminalsMapContainer && criminalsMapContainer.offsetHeight > 0) {
                // Force a redraw of the map
                setTimeout(function() {
                    criminalsMap.invalidateSize();
                    console.log("Map size invalidated again after container resize");
                }, 100);
            }
        });

        // Initialize smooth scrolling for navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Adjust for header height
                        behavior: 'smooth'
                    });
                }
            });
        });
        console.log("Navigation links initialized");

    } catch (error) {
        console.error("Error initializing landing page:", error);
    }
});

// Helper function to extract location from description
function extractLocationFromDescription(description, locationName1, locationName2) {
    // Use provided location name if available
    if (locationName1) return locationName1;
    if (locationName2) return locationName2;

    // Try to extract from description
    if (description) {
        // Look for "in [Location]" pattern
        const inMatch = description.match(/\bin\s+([A-Z][a-zA-Z\s]+)(?:[\.,]|\s|$)/);
        if (inMatch && inMatch[1]) {
            return inMatch[1].trim();
        }

        // Look for location at the beginning of the description
        const startMatch = description.match(/^([A-Z][a-zA-Z\s]+)(?:[\.,]|\s|$)/);
        if (startMatch && startMatch[1]) {
            return startMatch[1].trim();
        }
    }

    return 'Unknown Location';
}

// Format date object for display
function formatDate(dateObj) {
    if (!dateObj) return 'Unknown Date';

    const year = dateObj.year;
    const month = dateObj.month;
    const day = dateObj.day;

    if (!year) return 'Unknown Date';

    let dateStr = year.toString();

    if (month) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        dateStr = monthNames[month - 1] + ' ' + dateStr;

        if (day) {
            dateStr = day + ' ' + dateStr;
        }
    }

    return dateStr;
}
