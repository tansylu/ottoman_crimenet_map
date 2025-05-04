// Ottoman Crime Network Map - Criminals Map Module

// Variables for the criminals map
let selectedCriminalId = null;
let criminalJourneyLayer = null;
let allCriminals = [];
let criminalEvents = [];

/**
 * Fetch criminals for the criminals map
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function fetchCriminals(db, map) {
    console.log("Fetching criminals for criminals map");

    // Get the criminal selector dropdown
    const criminalSelector = document.getElementById('criminal-selector');

    // Fetch all criminals from Firestore
    db.collection('criminals').get().then((querySnapshot) => {
        console.log(`Found ${querySnapshot.size} criminals in Firestore`);

        const allCriminals = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allCriminals.push({
                id: doc.id,
                name: data.name || 'Unknown',
                birthdate: data.birthdate,
                birthplace: data.birthplace,
                profession: data.prof,
                nationality: data.nation,
                alias: data.alias
            });
        });

        // Sort criminals by name
        allCriminals.sort((a, b) => a.name.localeCompare(b.name));

        // Populate the criminal selector dropdown
        allCriminals.forEach(criminal => {
            const option = document.createElement('option');
            option.value = criminal.id;
            option.textContent = criminal.name;
            criminalSelector.appendChild(option);
        });

        // Add event listener to the criminal selector
        criminalSelector.addEventListener('change', function() {
            const criminalId = this.value;
            if (criminalId) {
                showCriminalJourney(criminalId, db, map);
            } else {
                // Clear the map if no criminal is selected
                if (window.criminalJourneyLayer) {
                    map.removeLayer(window.criminalJourneyLayer);
                    window.criminalJourneyLayer = null;
                }
            }
        });
    }).catch(error => {
        console.error("Error fetching criminals:", error);
        alert("Error loading criminal data. Please try again later.");
    });
}

/**
 * Show a criminal's journey on the map
 * @param {string} criminalId - ID of the criminal
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function showCriminalJourney(criminalId, db, map) {
    console.log("Showing journey for criminal:", criminalId);

    // Clear previous journey if any
    if (window.criminalJourneyLayer) {
        map.removeLayer(window.criminalJourneyLayer);
    }

    // Create a new layer group for the journey
    window.criminalJourneyLayer = L.layerGroup().addTo(map);

    // Create a cluster group specifically for the criminal journey
    const journeyClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 20, // Smaller radius for criminal journey to show more detail
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: false,
        disableClusteringAtZoom: 14,
        spiderfyDistanceMultiplier: 3,
        animate: false,
        iconCreateFunction: function(cluster) {
            // Count markers in the cluster
            const count = cluster.getChildCount();

            // Determine size based on count
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';

            // Create custom cluster icon with count
            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size} cluster-mixed">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(50, 50)
            });
        }
    });

    // Add the journey cluster group to the journey layer
    window.criminalJourneyLayer.addLayer(journeyClusterGroup);

    // Fetch events for this criminal without requiring composite index
    // Try both field names (criminal_id and criminalId) to ensure compatibility
    db.collection('events')
        .where('criminalId', '==', criminalId)
        .get()
        .then((querySnapshot) => {
            console.log(`Found ${querySnapshot.size} events for criminal ${criminalId}`);

            const events = [];
            const eventMarkers = [];
            const journeyPoints = [];

            // Process all events
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Check for different coordinate formats
                let hasValidCoordinates = false;
                let coordinates = null;

                // Check for location.latitude/longitude format
                if (data.location && data.location.latitude !== undefined && data.location.longitude !== undefined) {
                    hasValidCoordinates = true;
                    coordinates = {
                        latitude: data.location.latitude,
                        longitude: data.location.longitude
                    };
                }
                // Check for coordinates.latitude/longitude format
                else if (data.coordinates && data.coordinates.latitude !== undefined && data.coordinates.longitude !== undefined) {
                    hasValidCoordinates = true;
                    coordinates = {
                        latitude: data.coordinates.latitude,
                        longitude: data.coordinates.longitude
                    };
                }
                // Check for coordinates.lat/lng format
                else if (data.coordinates && data.coordinates.lat !== undefined && data.coordinates.lng !== undefined) {
                    hasValidCoordinates = true;
                    coordinates = {
                        latitude: data.coordinates.lat,
                        longitude: data.coordinates.lng
                    };
                }

                if (hasValidCoordinates) {
                    events.push({
                        id: doc.id,
                        type: data.type || 'Unknown',
                        date: data.date,
                        location: coordinates,
                        description: data.description,
                        locationName: extractLocationFromDescription(data.description, data.location_name, data.locationName)
                    });
                }
            });

            if (events.length === 0) {
                console.log("No events found for this criminal.");
                // Update the timeline info panel to show no events
                updateTimelineInfo([], criminalId);
                // Show the criminal details even if there are no events
                showCriminalDetails(criminalId);
                return;
            }

            // Sort events by date
            events.sort((a, b) => {
                if (!a.date || !b.date) return 0;
                if (a.date.year !== b.date.year) return a.date.year - b.date.year;
                if (a.date.month !== b.date.month) return (a.date.month || 0) - (b.date.month || 0);
                return (a.date.day || 0) - (b.date.day || 0);
            });

            // Add points to journey in chronological order
            events.forEach((event, index) => {
                const lat = event.location.latitude;
                const lng = event.location.longitude;
                journeyPoints.push([lat, lng]);

                // Create numbered marker icon based on event type using the utility function
                const markerIcon = window.markerUtils_createNumberedMarkerIcon
                    ? window.markerUtils_createNumberedMarkerIcon(index + 1, event.type)
                    : createNumberedMarkerIcon(index + 1, event.type);

                // Create marker for this event
                const marker = L.marker([lat, lng], {
                    icon: markerIcon,
                    riseOnHover: true,
                    title: event.description || 'Event'
                });

                // Add popup with event information
                let popupContent = `
                    <div class="event-popup">
                        <div class="event-number">${index + 1}</div>
                        <div class="event-type event-type-${event.type}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</div>
                        <div class="event-date">${formatDate(event.date)}</div>
                        <div class="event-location">${event.locationName}</div>
                        ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                    </div>
                `;

                marker.bindPopup(popupContent);

                // Add marker to journey cluster group
                journeyClusterGroup.addLayer(marker);
                eventMarkers.push(marker);

                // Draw arrow to next event if not the last one
                if (index < events.length - 1) {
                    const nextEvent = events[index + 1];
                    const nextLat = nextEvent.location.latitude;
                    const nextLng = nextEvent.location.longitude;

                    // Create arrow using the utility function
                    const arrow = window.markerUtils_createArrow
                        ? window.markerUtils_createArrow([lat, lng], [nextLat, nextLng], event.type)
                        : createArrow([lat, lng], [nextLat, nextLng], event.type);
                    window.criminalJourneyLayer.addLayer(arrow);
                }
            });

            // Fit the map to show all events
            if (eventMarkers.length > 0) {
                const group = L.featureGroup(eventMarkers);
                map.fitBounds(group.getBounds().pad(0.1));
            }

            // Update the timeline info panel
            updateTimelineInfo(events, criminalId);

            // Also show the criminal details
            showCriminalDetails(criminalId);
        })
        .catch(error => {
            console.error("Error fetching criminal journey:", error);
            alert("Error loading criminal journey. Please try again later.");
        });
}

/**
 * Update the timeline info panel with events
 * @param {Array} events - Array of event objects
 * @param {string} criminalId - ID of the criminal
 */
function updateTimelineInfo(events, criminalId) {
    const timelineEvents = document.getElementById('timeline-events');
    timelineEvents.innerHTML = '';

    if (events.length === 0) {
        timelineEvents.innerHTML = '<p>No events found for this criminal.</p>';
        return;
    }

    // Get the criminal name if available
    if (firebase && firebase.firestore) {
        firebase.firestore().collection('criminals').doc(criminalId).get().then((doc) => {
            if (doc.exists) {
                const criminal = doc.data();
                const criminalName = criminal.name || 'Unknown Criminal';

                // Update the panel header
                const panelHeader = document.querySelector('#timeline-info h3');
                if (panelHeader) {
                    panelHeader.innerText = `${criminalName}'s Journey`;
                }
            }
        }).catch(error => {
            console.error("Error getting criminal name:", error);
        });
    }

    // Add events to timeline in chronological order (already sorted)
    events.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'timeline-event';

        // Format date
        const dateStr = formatDate(event.date);

        // Create event type badge
        const eventTypeClass = `event-type event-type-${event.type}`;

        // Create HTML for the event item with numbered markers matching the map
        eventItem.innerHTML = `
            <div class="event-number">${index + 1}</div>
            <div class="event-date">${dateStr}</div>
            <div class="event-location">${event.locationName || 'Unknown Location'}</div>
            <span class="${eventTypeClass}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
            ${event.description && event.description.trim() !== '' ? `<div class="event-description">${event.description}</div>` : ''}
        `;

        timelineEvents.appendChild(eventItem);
    });
}

/**
 * Initialize the criminal info panel
 */
function initCriminalModal() {
    console.log("Initializing criminal info panel");
    // No need for modal initialization since we're using a fixed panel
}

/**
 * Show criminal details in the info panel
 * @param {string} criminalId - ID of the criminal
 */
function showCriminalDetails(criminalId) {
    console.log("Showing details for criminal:", criminalId);

    // Get the criminal info panel element
    const criminalInfoPanel = document.getElementById('criminal-info');

    if (!criminalInfoPanel) {
        console.error("Criminal info panel element not found");
        return;
    }

    // Make sure the panel is visible
    criminalInfoPanel.style.display = 'block';

    // Fetch criminal details from Firestore
    if (firebase && firebase.firestore) {
        firebase.firestore().collection('criminals').doc(criminalId).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();

                // Build the HTML for the criminal info
                let infoHTML = `<h3>${data.name || 'Unknown Criminal'}</h3>`;
                infoHTML += '<div class="criminal-details">';

                // Create a table-like structure for better formatting
                const details = [];

                if (data.alias) {
                    details.push({label: 'Alias', value: data.alias});
                }

                if (data.birthdate) {
                    details.push({label: 'Birth Date', value: data.birthdate});
                }

                if (data.birthplace) {
                    details.push({label: 'Birth Place', value: data.birthplace});
                }

                if (data.prof) {
                    details.push({label: 'Profession', value: data.prof});
                }

                if (data.nation) {
                    details.push({label: 'Nationality', value: data.nation});
                }

                // Add all details with consistent formatting
                details.forEach(detail => {
                    infoHTML += `<p><strong>${detail.label}:</strong> ${detail.value}</p>`;
                });

                infoHTML += '</div>';

                // Set the panel content
                criminalInfoPanel.innerHTML = infoHTML;
            } else {
                console.log("No criminal found with ID:", criminalId);
                criminalInfoPanel.innerHTML = '<p>No details found for this criminal.</p>';
            }
        }).catch(error => {
            console.error("Error getting criminal:", error);
            criminalInfoPanel.innerHTML = '<p>Error retrieving criminal details. Please try again.</p>';
        });
    } else {
        console.error("Firebase not initialized");
        criminalInfoPanel.innerHTML = '<p>Error: Firebase not initialized</p>';
    }
}

// These functions are already defined above, so we're removing the duplicates

// These functions are now imported from markerUtils.js

// Clear the criminal journey from the map
function clearCriminalJourney() {
    if (window.criminalJourneyLayer) {
        map.removeLayer(window.criminalJourneyLayer);
        window.criminalJourneyLayer = null;
    }

    // Clear the timeline info panel
    document.getElementById('timeline-events').innerHTML = '';
}

// This function is already defined above, so we're removing the duplicate
