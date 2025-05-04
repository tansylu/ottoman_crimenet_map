// Ottoman Crime Network Map - Events Map Module

/**
 * Fetch markers for the events map
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function fetchMarkers(db, map) {
    console.log("Fetching markers for events map");

    // Create a marker cluster group for the events map
    const markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 30,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: false,
        disableClusteringAtZoom: 14
    });

    map.addLayer(markerClusterGroup);

    // Track all markers and their data
    const allMarkers = [];
    const markerData = {};

    // Fetch events from Firestore
    db.collection('events').get().then((querySnapshot) => {
        console.log(`Found ${querySnapshot.size} events in Firestore`);

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Only create markers with valid coordinates
            if (data.location && data.location.latitude && data.location.longitude) {
                // Create marker using the utility function
                const locationName = data.location_name || data.locationName || '';
                const marker = createLocationMarker(
                    data.location.latitude,
                    data.location.longitude,
                    locationName,
                    data.type || 'default',
                    { size: 18, showLabel: !!locationName }
                );

                // Store marker data
                markerData[doc.id] = data;

                // Add popup with event information
                let popupContent = `<strong>${data.type || 'Event'}</strong><br>`;
                if (data.date) {
                    popupContent += `Date: ${data.date.year || 'Unknown'}<br>`;
                }
                if (data.description) {
                    popupContent += `${data.description}<br>`;
                }
                if (data.criminal_id) {
                    popupContent += `<a href="#" class="criminal-link" data-id="${data.criminal_id}">View Criminal</a>`;
                }

                marker.bindPopup(popupContent);

                // Add marker to cluster group
                markerClusterGroup.addLayer(marker);
                allMarkers.push(marker);
            }
        });

        console.log(`Added ${allMarkers.length} valid markers to the events map`);

        // Add event listeners to criminal links in popups
        setTimeout(() => {
            document.querySelectorAll('.criminal-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const criminalId = this.getAttribute('data-id');
                    showCriminalDetails(criminalId);
                });
            });
        }, 1000);

        // Connect time slider to marker visibility
        const timeSlider = document.getElementById('time-slider');
        if (timeSlider && timeSlider.noUiSlider) {
            timeSlider.noUiSlider.on('update', function(values, handle) {
                const year = parseInt(values[handle]);
                document.getElementById('current-year').textContent = year;

                // Update visible markers based on year
                updateMarkersForYear(year, allMarkers, markerData, markerClusterGroup);
            });
        }
    }).catch(error => {
        console.error("Error fetching markers:", error);
        alert("Error loading map data. Please try again later.");
    });
}

/**
 * Update markers based on the selected year
 * @param {number} year - Selected year
 * @param {Array} allMarkers - Array of all markers
 * @param {Object} markerData - Object containing marker data
 * @param {L.MarkerClusterGroup} markerClusterGroup - Marker cluster group
 */
function updateMarkersForYear(year, allMarkers, markerData, markerClusterGroup) {
    // Clear all markers
    markerClusterGroup.clearLayers();

    // Add markers for the selected year
    const visibleMarkers = [];

    allMarkers.forEach((marker, index) => {
        const data = markerData[Object.keys(markerData)[index]];
        if (data && data.date && data.date.year <= year) {
            markerClusterGroup.addLayer(marker);
            visibleMarkers.push(marker);
        }
    });

    console.log(`Showing ${visibleMarkers.length} markers for year ${year}`);
}

// Export functions if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchMarkers,
        updateMarkersForYear
    };
}
