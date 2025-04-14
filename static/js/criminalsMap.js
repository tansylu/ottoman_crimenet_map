// Variables for the criminals map
let selectedCriminalId = null;
let criminalJourneyLayer = null;
let allCriminals = [];
let criminalEvents = [];

// Define updateMarkers function for this view
function updateMarkers() {
    // This is a placeholder function to prevent errors
    // The criminals map doesn't use the time-based marker filtering
    console.log("updateMarkers called in criminals map view");

    // If we have a selected criminal, make sure their journey stays visible
    if (selectedCriminalId && criminalJourneyLayer) {
        console.log("Ensuring criminal journey stays visible");
        // No need to do anything as we're keeping the journey visible permanently
    }
}

// Override the updateMarkers function from map.js for this view
// We need to do this before the DOM is loaded to ensure our version is used
window.updateMarkers = function() {
    console.log("Using criminals map version of updateMarkers");
    // Do nothing - we want to keep the criminal journey visible
    // and not filter by year
};

// Initialize the criminals map view
document.addEventListener('DOMContentLoaded', function() {
    // Get Firebase config from the server
    const firebaseConfig = JSON.parse(document.getElementById('firebase-config').textContent);

    // Initialize Firebase
    initFirebase(firebaseConfig);

    // Initialize map
    initMap();

    // Initialize criminal modal
    initCriminalModal();

    // Initialize Ottoman borders
    initBorders();

    // Fetch markers and criminals
    fetchMarkers().then(() => {
        // After markers are loaded, fetch criminals
        fetchCriminals();
    }).catch(error => {
        console.error("Error fetching markers:", error);
    });

    // Initialize the criminal selector
    initCriminalSelector();

    // Handle window resize for responsive behavior
    let resizeTimeout;
    window.addEventListener('resize', function() {
        // Debounce resize event to prevent excessive reloading
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Refresh the map to adjust to new size
            map.invalidateSize();
        }, 250);
    });

    // Override reset view button functionality for this view
    document.getElementById('reset-view').addEventListener('click', function() {
        // Reset the map view
        map.setView(initialView.center, initialView.zoom);

        // If a criminal is selected, fit the map to show their journey
        if (selectedCriminalId && criminalJourneyLayer) {
            // Find all markers in the journey layer
            const markers = [];
            criminalJourneyLayer.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    markers.push(layer);
                }
            });

            // Fit the map to show all markers
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
    });
});

// Fetch all criminals from Firestore
function fetchCriminals() {
    console.log("Fetching criminals from Firestore...");
    db.collection('criminals').get().then((querySnapshot) => {
        console.log(`Found ${querySnapshot.size} criminals in Firestore`);

        allCriminals = [];

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
        populateCriminalSelector();
    }).catch(error => {
        console.error("Error fetching criminals:", error);
    });
}

// Initialize the criminal selector dropdown
function initCriminalSelector() {
    const selector = document.getElementById('criminal-selector');

    // Add event listener for selection change
    selector.addEventListener('change', function() {
        const criminalId = this.value;
        if (criminalId) {
            selectedCriminalId = criminalId;
            displayCriminalJourney(criminalId);
        } else {
            // Clear the map if no criminal is selected
            clearCriminalJourney();
        }
    });
}

// Populate the criminal selector dropdown with options
function populateCriminalSelector() {
    const selector = document.getElementById('criminal-selector');

    // Clear existing options except the first one
    while (selector.options.length > 1) {
        selector.remove(1);
    }

    // Add options for each criminal
    allCriminals.forEach(criminal => {
        const option = document.createElement('option');
        option.value = criminal.id;
        option.textContent = criminal.name;
        selector.appendChild(option);
    });
}

// Display the journey of a selected criminal
function displayCriminalJourney(criminalId) {
    // Clear any existing journey
    clearCriminalJourney();

    // Clear the marker cluster group to avoid showing other markers
    markerClusterGroup.clearLayers();

    // Find all events related to this criminal
    criminalEvents = allMarkers
        .filter(marker => marker.documentData.criminalId === criminalId)
        .map(marker => marker.documentData)
        .sort((a, b) => {
            if (a.date.year !== b.date.year) return a.date.year - b.date.year;
            if (a.date.month && b.date.month && a.date.month !== b.date.month) return a.date.month - b.date.month;
            if (a.date.day && b.date.day) return a.date.day - b.date.day;
            return 0;
        });

    if (criminalEvents.length === 0) {
        alert("No events found for this criminal.");
        return;
    }

    // Create a layer group for the journey
    criminalJourneyLayer = L.layerGroup().addTo(map);

    // Add markers for each event
    const eventMarkers = [];
    criminalEvents.forEach((event, index) => {
        // Get coordinates
        let lat, lng;
        if (event.coordinates && event.coordinates.latitude !== undefined) {
            lat = event.coordinates.latitude;
            lng = event.coordinates.longitude;
        } else if (event.coordinates) {
            lat = event.coordinates.lat;
            lng = event.coordinates.lng;
        } else {
            console.error("Invalid coordinates for event:", event);
            return;
        }

        // Create marker with number label
        const markerIcon = createNumberedMarkerIcon(index + 1, event.type);
        const marker = L.marker([lat, lng], {
            icon: markerIcon,
            riseOnHover: true
        });

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'marker-popup';

        const title = document.createElement('div');
        title.className = 'marker-title';
        title.innerText = event.location || 'Untitled Location';
        popupContent.appendChild(title);

        if (event.description && event.description.trim() !== '') {
            const description = document.createElement('div');
            description.className = 'marker-description';
            description.innerText = event.description;
            popupContent.appendChild(description);
        }

        // Format the date
        let dateString = "";
        if (event.date) {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];

            if (event.date.month && event.date.day) {
                // Full date
                const monthName = monthNames[event.date.month - 1] || `Month ${event.date.month}`;
                dateString = `${monthName} ${event.date.day}, ${event.date.year}`;
            } else if (event.date.month) {
                // Month and year
                const monthName = monthNames[event.date.month - 1] || `Month ${event.date.month}`;
                dateString = `${monthName} ${event.date.year}`;
            } else {
                // Year only
                dateString = `${event.date.year}`;
            }
        }

        const dateText = document.createElement('div');
        dateText.className = 'marker-date';
        dateText.innerText = dateString;
        popupContent.appendChild(dateText);

        marker.bindPopup(popupContent);
        criminalJourneyLayer.addLayer(marker);
        eventMarkers.push(marker);

        // Draw arrow to next event if not the last one
        if (index < criminalEvents.length - 1) {
            const nextEvent = criminalEvents[index + 1];
            let nextLat, nextLng;

            if (nextEvent.coordinates && nextEvent.coordinates.latitude !== undefined) {
                nextLat = nextEvent.coordinates.latitude;
                nextLng = nextEvent.coordinates.longitude;
            } else if (nextEvent.coordinates) {
                nextLat = nextEvent.coordinates.lat;
                nextLng = nextEvent.coordinates.lng;
            }

            if (nextLat && nextLng) {
                const arrow = createArrow([lat, lng], [nextLat, nextLng], event.type);
                criminalJourneyLayer.addLayer(arrow);
            }
        }
    });

    // Fit the map to show all events
    if (eventMarkers.length > 0) {
        const group = L.featureGroup(eventMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }

    // Update the timeline info panel
    updateTimelineInfo(criminalId);
}

// Create a numbered marker icon
function createNumberedMarkerIcon(number, eventType) {
    let markerColor;

    if (eventType === 'forgery') {
        markerColor = 'red';
    } else if (eventType === 'escape') {
        markerColor = 'blue';
    } else if (eventType === 'arrest') {
        markerColor = 'black';
    } else {
        markerColor = 'gray';
    }

    return L.divIcon({
        className: 'custom-numbered-marker',
        html: `<div class="marker-number" style="background-color: ${markerColor};">${number}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// Create an arrow between two points
function createArrow(fromPoint, toPoint, eventType) {
    let arrowColor;

    if (eventType === 'forgery') {
        arrowColor = '#ff0000'; // Red
    } else if (eventType === 'escape') {
        arrowColor = '#0000ff'; // Blue
    } else if (eventType === 'arrest') {
        arrowColor = '#000000'; // Black
    } else {
        arrowColor = '#808080'; // Gray
    }

    // Create a polyline with arrow markers
    const arrow = L.polyline([fromPoint, toPoint], {
        color: arrowColor,
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
        smoothFactor: 1
    });

    // Check if the Polyline Decorator plugin is available
    if (typeof L.polylineDecorator === 'function') {
        // Add arrow decorations
        const arrowHead = L.polylineDecorator(arrow, {
            patterns: [
                {
                    offset: '100%',
                    repeat: 0,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 15,
                        polygon: false,
                        pathOptions: {
                            stroke: true,
                            color: arrowColor,
                            weight: 3
                        }
                    })
                }
            ]
        });

        // Return a layer group with both the line and the arrow
        return L.layerGroup([arrow, arrowHead]);
    } else {
        console.warn('Polyline Decorator plugin not available. Falling back to simple line.');
        return arrow;
    }
}

// Clear the criminal journey from the map
function clearCriminalJourney() {
    if (criminalJourneyLayer) {
        map.removeLayer(criminalJourneyLayer);
        criminalJourneyLayer = null;
    }

    // Clear the timeline info panel
    document.getElementById('timeline-events').innerHTML = '';
}

// Update the timeline info panel
function updateTimelineInfo(criminalId) {
    const timelineEvents = document.getElementById('timeline-events');
    timelineEvents.innerHTML = '';

    // Get the criminal name
    const criminal = allCriminals.find(c => c.id === criminalId);
    const criminalName = criminal ? criminal.name : 'Unknown Criminal';

    // Add criminal name to the panel header
    const panelHeader = document.querySelector('#timeline-info h3');
    panelHeader.innerText = `${criminalName}'s Journey`;

    // Add each event to the timeline
    criminalEvents.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';

        // Format the date
        let dateStr = "";
        if (event.date) {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];

            if (event.date.month && event.date.day) {
                // Full date
                const monthName = monthNames[event.date.month - 1] || `Month ${event.date.month}`;
                dateStr = `${monthName} ${event.date.day}, ${event.date.year}`;
            } else if (event.date.month) {
                // Month and year
                const monthName = monthNames[event.date.month - 1] || `Month ${event.date.month}`;
                dateStr = `${monthName} ${event.date.year}`;
            } else {
                // Year only
                dateStr = `${event.date.year}`;
            }
        }

        // Create event type badge
        const eventTypeClass = `event-type event-type-${event.type}`;

        // Create HTML for the event item
        eventItem.innerHTML = `
            <div class="event-number">${index + 1}</div>
            <div class="event-date">${dateStr}</div>
            <div class="event-location">${event.location}</div>
            <span class="${eventTypeClass}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
            ${event.description && event.description.trim() !== '' ? `<div class="event-description">${event.description}</div>` : ''}
        `;

        timelineEvents.appendChild(eventItem);
    });
}
