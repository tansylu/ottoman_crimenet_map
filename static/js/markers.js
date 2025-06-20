// Fetch all marker data from Firestore
function fetchMarkers() {
    console.log("Fetching markers from Firestore...");
    db.collection('events').get().then((querySnapshot) => {
        console.log(`Found ${querySnapshot.size} events in Firestore`);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const marker = createMarker(doc);
            
            // Only add valid markers (with coordinates)
            if (marker) {
                allMarkers.push(marker);
                markerData[doc.id] = data;
            }
        });
        
        console.log(`Added ${allMarkers.length} valid markers to the map`);
        
        // Initial update after all markers are loaded
        updateMarkers();
    }).catch(error => {
        console.error("Error fetching markers:", error);
        alert("Error loading map data. Please try again later.");
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
    if (markerType === 'forgery') {
        markerIcon = L.divIcon({
            html: '<div style="background-color: red; width: 10px; height: 10px; border-radius: 50%;"></div>',
            className: 'marker-icon'
        });
    } else if (markerType === 'escape') {
        markerIcon = L.divIcon({
            html: '<div style="background-color: blue; width: 10px; height: 10px; border-radius: 50%;"></div>',
            className: 'marker-icon'
        });
    } else if (markerType === 'arrest') {
        markerIcon = L.divIcon({
            html: '<div style="background-color: black; width: 10px; height: 10px; border-radius: 50%;"></div>',
            className: 'marker-icon'
        });
    } else {
        // Default marker for any other types
        markerIcon = L.divIcon({
            html: '<div style="background-color: gray; width: 10px; height: 10px; border-radius: 50%;"></div>',
            className: 'marker-icon'
        });
    }
    
    const marker = L.marker([lat, lng], {icon: markerIcon});
    
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
    
    return marker;
}

// Show all related locations for a criminal
function showRelatedLocations(criminalId) {
    // Remove all currently visible markers
    visibleMarkers.forEach(marker => map.removeLayer(marker));
    visibleMarkers = [];
    
    // Find all markers related to this criminal
    const relatedMarkers = allMarkers.filter(marker => 
        marker.documentData.criminalId === criminalId
    );
    
    if (relatedMarkers.length === 0) {
        alert("No locations found for this criminal.");
        return;
    }
    
    // Add markers to map
    relatedMarkers.forEach(marker => {
        map.addLayer(marker);
        visibleMarkers.push(marker);
    });
    
    // If there are markers, fit map to contain all of them
    if (relatedMarkers.length > 0) {
        const group = L.featureGroup(relatedMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
