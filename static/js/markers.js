// Fetch all marker data from Firestore
function fetchMarkers() {
    console.log("Fetching markers from Firestore...");
    return new Promise((resolve, reject) => {
        db.collection('events').get().then((querySnapshot) => {
            console.log(`Found ${querySnapshot.size} events in Firestore`);

            // Track the maximum year in the data
            let maxYearInData = window.START_YEAR; // Default to the start year

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const marker = createMarker(doc);

                // Only add valid markers (with coordinates)
                if (marker) {
                    allMarkers.push(marker);
                    markerData[doc.id] = data;

                    // Update max year if this event has a later year
                    if (data.date && data.date.year && data.date.year > maxYearInData) {
                        maxYearInData = data.date.year;
                    }
                }
            });

            console.log(`Added ${allMarkers.length} valid markers to the map`);
            console.log(`Maximum year in data: ${maxYearInData}`);

            // Update the time slider's end year based on the data if the function exists
            if (typeof updateTimeSliderRange === 'function') {
                updateTimeSliderRange(maxYearInData);
            }

            // Initial update after all markers are loaded if the function exists
            if (typeof updateMarkers === 'function') {
                updateMarkers();
            }

            resolve();
        }).catch(error => {
            console.error("Error fetching markers:", error);
            alert("Error loading map data. Please try again later.");
            reject(error);
        });
    });
}

// Function to create a marker with appropriate popup
function createMarker(docSnapshot, showPopup = false) {
    const data = docSnapshot.data();
    const id = docSnapshot.id;

    // Handle coordinates whether they're stored as Geopoint or lat/lng object
    let lat, lng;
    if (data.coordinates && data.coordinates.latitude !== undefined) {
        // Handling Geopoint format
        lat = data.coordinates.latitude;
        lng = data.coordinates.longitude;
    } else if (data.coordinates) {
        // Handling object format {lat, lng}
        lat = data.coordinates.lat;
        lng = data.coordinates.lng;
    } else {
        console.error("Invalid coordinates for marker:", id);
        return null; // Skip this marker
    }

    const markerType = data.type; // 'forgery', 'escape', or 'arrest'

    // Different icons for different types of events
    let markerIcon;
    let markerColor;

    // Responsive marker size based on screen width
    let markerSize = 14; // Default size
    if (window.innerWidth <= 768) {
        markerSize = 12; // Medium screens
    }
    if (window.innerWidth <= 480) {
        markerSize = 10; // Small screens
    }

    // Get location name for the label
    const locationName = data.location || 'Unknown';

    if (markerType === 'forgery') {
        markerColor = '#9E4B4B'; // Using the alert-red variable color
    } else if (markerType === 'escape') {
        markerColor = '#4B6455'; // Using the forest green variable color
    } else if (markerType === 'arrest') {
        markerColor = '#2C2C2C'; // Using the neutral-dark variable color
    } else {
        // Default marker for any other types
        markerColor = '#A67B5B'; // Using the secondary variable color
    }

    // Create HTML for the marker with animation and label
    const markerHtml = `
        <div class="marker-container">
            <div class="marker-dot" style="background-color: ${markerColor}; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; animation: pulse 2s infinite;"></div>
            <div class="marker-label">${locationName}</div>
        </div>
    `;

    markerIcon = L.divIcon({
        html: markerHtml,
        className: 'marker-icon',
        iconSize: [Math.max(markerSize + 20, 120), markerSize + 50], // Make room for the label, ensure minimum width
        iconAnchor: [Math.max(markerSize + 20, 120)/2, markerSize/2] // Center the icon on the coordinates
    });

    // Create the marker with custom icon
    const marker = L.marker([lat, lng], {
        icon: markerIcon,
        // Add additional properties for clustering
        riseOnHover: true, // Bring to front on hover
        title: locationName // Tooltip on hover
    });

    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.className = 'marker-popup';

    const title = document.createElement('div');
    title.className = 'marker-title';
    title.innerText = data.location || 'Untitled Location';
    popupContent.appendChild(title);

    if (data.description && data.description.trim() !== '') {
        const description = document.createElement('div');
        description.className = 'marker-description';
        description.innerText = data.description;
        popupContent.appendChild(description);
    }

    const typeText = document.createElement('div');
    typeText.innerText = `Type: ${markerType.charAt(0).toUpperCase() + markerType.slice(1)}`;
    popupContent.appendChild(typeText);

    const dateText = document.createElement('div');
    let dateString = "Date: ";
    if (data.date) {
        // Format the month name based on numeric value
        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];

        if (data.date.month && data.date.day) {
            // Full date with month name, day and year
            const monthName = monthNames[data.date.month - 1] || `Month ${data.date.month}`;
            dateString += `${monthName} ${data.date.day}, ${data.date.year}`;
        } else if (data.date.month) {
            // Month and year only
            const monthName = monthNames[data.date.month - 1] || `Month ${data.date.month}`;
            dateString += `${monthName} ${data.date.year}`;
        } else {
            // Year only
            dateString += `${data.date.year}`;
        }
    }
    dateText.innerText = dateString;
    popupContent.appendChild(dateText);

    // Add criminal link if this marker is associated with a criminal
    if (data.criminalId) {
        const criminalLink = document.createElement('div');
        criminalLink.className = 'marker-link';
        criminalLink.innerText = 'Show criminal details';
        criminalLink.addEventListener('click', () => showCriminalDetails(data.criminalId));
        popupContent.appendChild(criminalLink);

        // Add related locations link
        const relatedLink = document.createElement('div');
        relatedLink.className = 'marker-link';
        relatedLink.innerText = 'Show all related locations';
        relatedLink.addEventListener('click', () => showRelatedLocations(data.criminalId));
        popupContent.appendChild(relatedLink);
    }

    marker.bindPopup(popupContent);

    // Add double-click handler to show criminal details
    marker.on('dblclick', function() {
        if (data.criminalId) {
            showCriminalDetails(data.criminalId);
        }
    });

    // Store the data with the marker for reference
    marker.documentData = data;
    marker.documentId = id;

    // Store the location name and type for clustering purposes
    marker.locationName = locationName;
    marker.markerType = markerType;
    marker.markerColor = markerColor;

    return marker;
}

// Show all related locations for a criminal
function showRelatedLocations(criminalId) {
    // Clear the cluster group
    markerClusterGroup.clearLayers();
    visibleMarkers = [];

    // Find all markers related to this criminal
    const relatedMarkers = allMarkers.filter(marker =>
        marker.documentData.criminalId === criminalId
    );

    if (relatedMarkers.length === 0) {
        alert("No locations found for this criminal.");
        return;
    }

    // Add markers to cluster group
    relatedMarkers.forEach(marker => {
        markerClusterGroup.addLayer(marker);
        visibleMarkers.push(marker);
    });

    // We still want to fit the map for related locations (but not for year changes)
    if (relatedMarkers.length > 0) {
        const group = L.featureGroup(relatedMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
