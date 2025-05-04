// Ottoman Crime Network Map - Map Fullscreen Module

/**
 * Initialize fullscreen functionality for the criminal journeys map
 * @param {L.Map} mapInstance - Optional Leaflet map instance
 */
function initFullscreenToggle(mapInstance) {
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const container = document.querySelector('.criminal-journeys-container');
    const criminalsMapElement = document.getElementById('criminals-map');

    if (!fullscreenToggle || !container || !criminalsMapElement) {
        console.warn('Fullscreen toggle elements not found');
        return;
    }

    // Function to get the map instance
    function getMapInstance() {
        // First try the provided instance
        if (mapInstance) return mapInstance;

        // Then try the global variable
        if (window.criminalsMapInstance) return window.criminalsMapInstance;

        // Finally try to get it from Leaflet's internal registry
        if (L && L.map && L.map.instances) {
            const instances = Array.from(L.map.instances);
            for (let i = 0; i < instances.length; i++) {
                if (instances[i]._container === criminalsMapElement) {
                    return instances[i];
                }
            }
        }

        return null;
    }

    // Toggle fullscreen mode
    fullscreenToggle.addEventListener('click', function() {
        container.classList.toggle('fullscreen');

        // Update the button icon
        const icon = fullscreenToggle.querySelector('i');
        if (container.classList.contains('fullscreen')) {
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
            fullscreenToggle.setAttribute('title', 'Exit fullscreen');
        } else {
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
            fullscreenToggle.setAttribute('title', 'Enter fullscreen');
        }

        // Invalidate the map size to ensure it renders correctly
        const mapInstance = getMapInstance();
        if (mapInstance) {
            setTimeout(function() {
                mapInstance.invalidateSize();
            }, 100);
        } else {
            console.warn('No map instance available for invalidateSize');
        }
    });

    // Allow ESC key to exit fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && container.classList.contains('fullscreen')) {
            fullscreenToggle.click();
        }
    });

    // Handle window resize to ensure map renders correctly
    window.addEventListener('resize', function() {
        const mapInstance = getMapInstance();
        if (mapInstance) {
            mapInstance.invalidateSize();
        }
    });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // This will be called when included in the main page
    initFullscreenToggle();
});

// Export the function if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initFullscreenToggle
    };
}
