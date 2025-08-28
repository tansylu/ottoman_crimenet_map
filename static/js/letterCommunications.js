
console.log("letterCommunications.js loaded");

// Make sure communicationLayer is initialized
let communicationLayer = null;
let allDiplomats = [];
let selectedDiplomatId = null;

/**
 * Fetch diplomats for the communications map
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function fetchDiplomats(db, map) {
    console.log("Fetching diplomats for communications map");

    // Get the diplomat selector dropdown
    const diplomatSelector = document.getElementById('diplomat-selector');

    if (!diplomatSelector) {
        console.error("Diplomat selector not found");
        return;
    }

    // Clear any existing options except the first one
    while (diplomatSelector.options.length > 1) {
        diplomatSelector.remove(1);
    }

    // Fetch all diplomats from Firestore
    db.collection('diplomats').get().then((querySnapshot) => {
        console.log(`Found ${querySnapshot.size} diplomats in Firestore`);

        allDiplomats = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allDiplomats.push({
                id: doc.id,
                name: data.name || 'Unknown',
                title: data.title || '',
                country: data.country || '',
                location: data.location || ''
            });
        });

        // Sort diplomats by name
        allDiplomats.sort((a, b) => a.name.localeCompare(b.name));

        // Populate the diplomat selector dropdown
        allDiplomats.forEach(diplomat => {
            const option = document.createElement('option');
            option.value = diplomat.id;
            option.textContent = diplomat.name;
            diplomatSelector.appendChild(option);
        });

        // Add event listener to the diplomat selector
        diplomatSelector.addEventListener('change', function() {
            const diplomatId = this.value;

            // Immediately blur the select element to collapse the dropdown
            this.blur();

            if (diplomatId) {
                fetchDiplomatLetters(diplomatId, db, map);
            } else {
                // Clear the map if no diplomat is selected
                if (communicationLayer) {
                    map.removeLayer(communicationLayer);
                    communicationLayer = null;
                }
                clearDescriptionBox();
            }
        });
    }).catch(error => {
        console.error("Error fetching diplomats:", error);
        alert("Error loading diplomat data. Please try again later.");
    });
}
/**
 * Fetch letters for a specific diplomat
 * @param {string} diplomatId - ID of the diplomat
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function fetchDiplomatLetters(diplomatId, db, map) {
    console.log("Fetching letters for diplomat:", diplomatId);

    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }

    communicationLayer = L.layerGroup().addTo(map);

    const communicationsClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 30,
        spiderfyOnMaxZoom: false, // Disable spiderfy to prevent dummy arrows
        disableClusteringAtZoom: 12, // Disable clustering at higher zoom levels
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';

            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size} cluster-mixed">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(50, 50)
            });
        }
    });

    communicationLayer.addLayer(communicationsClusterGroup);

    // Get the selected diplomat's information
    const diplomat = allDiplomats.find(d => d.id === diplomatId);
    if (!diplomat) {
        console.error("Selected diplomat not found in allDiplomats array");
        return;
    }

    console.log("Selected diplomat:", diplomat);

    // Query letters where diplomat is sender OR receiver
    const letters = [];

    // Get all communications and filter manually
    db.collection('communications')
        .get()
        .then(snapshot => {
            console.log(`Found ${snapshot.size} total communications`);

            snapshot.forEach(doc => {
                const data = doc.data();

                // Check if this diplomat is sender or receiver
                // Convert names to IDs for comparison (lowercase with underscores)
                const senderId = data.sender ? data.sender.replace(/\s+/g, '_').toLowerCase() : '';
                const receiverId = data.receiver ? data.receiver.replace(/\s+/g, '_').toLowerCase() : '';

                if (senderId === diplomat.id || receiverId === diplomat.id) {
                    letters.push({...data, id: doc.id});
                }
            });

            console.log(`Found ${letters.length} letters for diplomat ${diplomat.name}`);

            displayLettersOnMap(letters, diplomatId, map, communicationsClusterGroup);
        })
        .catch(error => {
            console.error("Error fetching letters:", error);
            alert("Error loading letter data. Please try again later.");
        });
}

/**
 * Display letters on the map with arrows between sender and receiver
 * @param {Array} letters - Array of letter data
 * @param {string} diplomatId - ID of the selected diplomat
 * @param {L.Map} map - Leaflet map instance
 * @param {L.MarkerClusterGroup} clusterGroup - Marker cluster group
 */
function displayLettersOnMap(letters, diplomatId, map, clusterGroup) {
    if (letters.length === 0) {
        updateDescriptionBox(`No letters found for this diplomat.`);
        return;
    }

    const diplomat = allDiplomats.find(d => d.id === diplomatId);
    updateDescriptionBox(diplomat);

    // Filter to show only OUTGOING letters (where selected diplomat is the sender)
    const outgoingLetters = letters.filter(letter => {
        const senderId = letter.sender ? letter.sender.replace(/\s+/g, '_').toLowerCase() : '';
        return senderId === diplomatId;
    });

    if (outgoingLetters.length === 0) {
        updateDescriptionBox(`No outgoing letters found for ${diplomat.name}.`);
        return;
    }

    console.log(`Showing ${outgoingLetters.length} outgoing letters for ${diplomat.name}`);

    // Group communications by unique routes (only outgoing)
    const routeGroups = new Map();
    const locationToMarkers = new Map();
    const markers = [];

    // Process only outgoing letters
    outgoingLetters.forEach((letter, index) => {
        if (!letter.sender_location || !letter.receiver_location) return;

        // Create a unique route key for outgoing communications
        const routeKey = `${letter.sender_location}__to__${letter.receiver_location}`;
        
        if (!routeGroups.has(routeKey)) {
            routeGroups.set(routeKey, {
                letters: [],
                sender_location: letter.sender_location,
                receiver_location: letter.receiver_location,
                sender: letter.sender,
                receiver: letter.receiver
            });
        }
        routeGroups.get(routeKey).letters.push(letter);

        // Add sender location (selected diplomat's location)
        if (!locationToMarkers.has(letter.sender_location)) {
            locationToMarkers.set(letter.sender_location, {
                letters: [],
                type: 'sender',
                name: letter.sender
            });
        }
        locationToMarkers.get(letter.sender_location).letters.push(letter);

        // Add receiver locations
        if (!locationToMarkers.has(letter.receiver_location)) {
            locationToMarkers.set(letter.receiver_location, {
                letters: [],
                type: 'receiver', 
                name: letter.receiver
            });
        }
        locationToMarkers.get(letter.receiver_location).letters.push(letter);
    });

    // Process location promises for unique locations only
    const locationPromises = Array.from(locationToMarkers.keys()).map(location => 
        getLocationCoordinates(location).then(coords => ({ location, coords }))
    );

    Promise.all(locationPromises).then(locationData => {
        const locationCoords = new Map();
        locationData.forEach(({ location, coords }) => {
            locationCoords.set(location, coords);
        });

        // Create markers for each unique location
        locationToMarkers.forEach((data, location) => {
            const coords = locationCoords.get(location);
            if (!coords) return;

            const letterCount = data.letters.length;
            const marker = L.marker([coords.lat, coords.lng], {
                icon: createMarkerIcon(data.type, letterCount),
                interactive: false, // Make markers non-interactive
                riseOnHover: false
            });

            // Don't bind popup or make markers clickable
            clusterGroup.addLayer(marker);
            markers.push(marker);
        });

        // Create arrows for unique routes only
        routeGroups.forEach(routeData => {
            const senderCoords = locationCoords.get(routeData.sender_location);
            const receiverCoords = locationCoords.get(routeData.receiver_location);
            
            if (!senderCoords || !receiverCoords) return;

            // Create only one arrow per unique route, regardless of number of communications
            const arrow = window.markerUtils_createArrow
                ? window.markerUtils_createArrow([senderCoords.lat, senderCoords.lng], [receiverCoords.lat, receiverCoords.lng], routeData.letters[0].type || 'letter')
                : createArrow([senderCoords.lat, senderCoords.lng], [receiverCoords.lat, receiverCoords.lng], routeData.letters[0].type || 'letter');

            communicationLayer.addLayer(arrow);
        });

        // Fit map to show all markers
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }).catch(error => {
        console.error(`Error getting coordinates:`, error);
    });

    // Update communications info panel with outgoing letters only
    updateCommunicationsInfo(outgoingLetters);
}

/**
 * Create popup content for a letter
 * @param {Object} letter - Letter data
 * @param {string} perspective - 'sender' or 'receiver'
 * @returns {string} HTML content for popup
 */
function createPopupContent(letter, perspective) {
    const isSender = perspective === 'sender';
    const name = isSender ? letter.sender : letter.receiver;
    const location = isSender ? letter.sender_location : letter.receiver_location;
    const otherName = isSender ? letter.receiver : letter.sender;
    const direction = isSender ? 'To' : 'From';

    return `
        <div class="marker-popup">
            <h3>${name || 'Unknown'}</h3>
            <p><strong>Location:</strong> ${location || 'Unknown'}</p>
            <p><strong>${direction}:</strong> ${otherName || 'Unknown'}</p>
            <p><strong>Date:</strong> ${formatDate(letter.date)}</p>
        </div>
    `;
}

/**
 * Create popup content for a location with multiple letters
 * @param {Array} letters - Array of letter data at this location
 * @param {string} type - 'sender' or 'receiver'
 * @param {string} location - Location name
 * @returns {string} HTML content for popup
 */
function createLocationPopupContent(letters, type, location) {
    const uniquePersons = [...new Set(letters.map(letter => 
        type === 'sender' ? letter.sender : letter.receiver
    ))];
    
    const letterCount = letters.length;
    const personList = uniquePersons.slice(0, 3).join(', ') + 
        (uniquePersons.length > 3 ? ` and ${uniquePersons.length - 3} others` : '');

    return `
        <div class="marker-popup">
            <h3>${location}</h3>
            <p><strong>Role:</strong> ${type === 'sender' ? 'Sending' : 'Receiving'} location</p>
            <p><strong>Communications:</strong> ${letterCount}</p>
            <p><strong>People:</strong> ${personList}</p>
            <div class="communications-list">
                ${letters.slice(0, 5).map(letter => {
                    const otherPerson = type === 'sender' ? letter.receiver : letter.sender;
                    const direction = type === 'sender' ? 'To' : 'From';
                    return `
                        <div class="communication-item">
                            <small><strong>${direction}:</strong> ${otherPerson || 'Unknown'}</small>
                            <small><strong>Date:</strong> ${formatDate(letter.date)}</small>
                        </div>
                    `;
                }).join('')}
                ${letters.length > 5 ? `<small><em>... and ${letters.length - 5} more</em></small>` : ''}
            </div>
        </div>
    `;
}

/**
 * Update the description box with diplomat information
 * @param {Object|string} content - Diplomat object or message string
 */
function updateDescriptionBox(content) {
    const descriptionElement = document.getElementById('diplomat-description');
    if (!descriptionElement) return;

    if (typeof content === 'string') {
        descriptionElement.innerHTML = `<p>${content}</p>`;
        return;
    }

    let description = `<h3>${content.name}</h3>`;
    if (content.title) description += `<p><strong>Title:</strong> ${content.title}</p>`;
    if (content.country) description += `<p><strong>Country:</strong> ${content.country}</p>`;
    
    // Add information about the one-way direction display
    description += `<p><em>Showing outgoing correspondence only (letters sent by ${content.name})</em></p>`;

    descriptionElement.innerHTML = description;
}

/**
 * Clear the description box
 */
function clearDescriptionBox() {
    const descriptionElement = document.getElementById('diplomat-description');
    if (descriptionElement) {
        descriptionElement.innerHTML = '<p class="initial-message">Select a diplomat to view their communications</p>';
    }
}

/**
 * Fetch all letters and display them on the map
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function fetchAllLetters(db, map) {
    console.log("Fetching all letters for communications map");

    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }

    communicationLayer = L.layerGroup().addTo(map);

    const communicationsClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 20,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 14,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';

            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size} cluster-mixed">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(50, 50)
            });
        }
    });

    communicationLayer.addLayer(communicationsClusterGroup);

    // Query all letters
    db.collection('communications')
        .get()
        .then(snapshot => {
            const letters = [];
            snapshot.forEach(doc => {
                letters.push({...doc.data(), id: doc.id});
            });

            if (letters.length === 0) {
                updateDescriptionBox("No letters found in the database.");
                return;
            }

            updateDescriptionBox("Showing all diplomatic communications");

            const markers = [];

            letters.forEach((letter, index) => {
                if (!letter.senderLocation || !letter.receiverLocation) return;

                const senderLat = letter.senderLocation.latitude;
                const senderLng = letter.senderLocation.longitude;
                const receiverLat = letter.receiverLocation.latitude;
                const receiverLng = letter.receiverLocation.longitude;

                // Create sender marker
                const senderMarker = L.marker([senderLat, senderLng], {
                    icon: createMarkerIcon('sender', index + 1),
                    interactive: false, // Make markers non-interactive
                    riseOnHover: false
                });

                // Create receiver marker
                const receiverMarker = L.marker([receiverLat, receiverLng], {
                    icon: createMarkerIcon('receiver', index + 1),
                    interactive: false, // Make markers non-interactive
                    riseOnHover: false
                });

                // Don't bind popups - markers are non-interactive
                // Add markers to cluster group
                communicationsClusterGroup.addLayer(senderMarker);
                communicationsClusterGroup.addLayer(receiverMarker);
                markers.push(senderMarker, receiverMarker);

                // Create arrow between sender and receiver
                const arrow = window.markerUtils_createArrow
                    ? window.markerUtils_createArrow([senderLat, senderLng], [receiverLat, receiverLng], letter.type || 'letter')
                    : createArrow([senderLat, senderLng], [receiverLat, receiverLng], letter.type || 'letter');

                communicationLayer.addLayer(arrow);
            });

            // Fit map to show all markers
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }

            // Update communications info panel
            updateCommunicationsInfo(letters);
        })
        .catch(error => {
            console.error("Error fetching all letters:", error);
            alert("Error loading letter data. Please try again later.");
        });
}

/**
 * Fetch all letter communications (alternative to diplomat-specific communications)
 * @param {Object} db - Firestore database instance
 * @param {L.Map} map - Leaflet map instance
 */
function fetchLetterCommunications(db, map) {
    console.log("Fetching all letter communications");

    // Clear previous communications if any
    if (communicationLayer) {
        map.removeLayer(communicationLayer);
    }

    // Create a new layer group for the communications
    communicationLayer = L.layerGroup().addTo(map);

    // Create a cluster group specifically for the communications
    const communicationsClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 30,
        spiderfyOnMaxZoom: false, // Disable spiderfy to prevent dummy arrows
        zoomToBoundsOnClick: false,
        disableClusteringAtZoom: 12, // Disable clustering at higher zoom levels
        animate: false,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 3) size = 'medium';
            if (count > 6) size = 'large';

            return L.divIcon({
                html: `<div class="cluster-icon cluster-${size} cluster-mixed">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: L.point(50, 50)
            });
        }
    });

    communicationLayer.addLayer(communicationsClusterGroup);

    // Fetch all communications from Firestore
    db.collection('communications').get()
        .then((querySnapshot) => {
            console.log(`Found ${querySnapshot.size} communications total`);

            const communications = [];
            const communicationMarkers = [];

            // Process all communications
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Processing communication:", data);

                // Skip if no location data
                if (!data.sender_location || !data.receiver_location) {
                    console.warn("Communication missing location data:", doc.id);
                    return;
                }

                communications.push({
                    id: doc.id,
                    date: data.date,
                    sender: data.sender,
                    receiver: data.receiver,
                    // Create normalized IDs from sender and receiver names
                    senderId: data.sender ? data.sender.replace(/\s+/g, '_').toLowerCase() : '',
                    receiverId: data.receiver ? data.receiver.replace(/\s+/g, '_').toLowerCase() : '',
                    senderName: data.sender,
                    receiverName: data.receiver,
                    senderLocation: null, // Will be populated with coordinates
                    receiverLocation: null, // Will be populated with coordinates
                    sender_location: data.sender_location,
                    receiver_location: data.receiver_location,
                    subject: data.subject,
                    content: data.content,
                    type: data.type || 'letter'
                });
            });

            // Process locations and convert to coordinates
            const locationPromises = [];

            communications.forEach(comm => {
                // Get coordinates for sender location
                const senderPromise = getLocationCoordinates(comm.sender_location)
                    .then(coords => {
                        comm.senderLocation = {
                            latitude: coords.lat,
                            longitude: coords.lng
                        };
                    });

                // Get coordinates for receiver location
                const receiverPromise = getLocationCoordinates(comm.receiver_location)
                    .then(coords => {
                        comm.receiverLocation = {
                            latitude: coords.lat,
                            longitude: coords.lng
                        };
                    });

                locationPromises.push(senderPromise, receiverPromise);
            });

            // Wait for all location conversions to complete
            Promise.all(locationPromises).then(() => {
                // Sort communications by date
                communications.sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return a.date.seconds - b.date.seconds;
                });

                // Group communications by unique routes (sender-receiver pairs)
                const routeGroups = new Map();
                const locationToMarkers = new Map();

                communications.forEach(comm => {
                    // Create a unique route key (normalize order to avoid duplicate routes)
                    const locations = [comm.sender_location, comm.receiver_location].sort();
                    const routeKey = `${locations[0]}__${locations[1]}`;
                    
                    if (!routeGroups.has(routeKey)) {
                        routeGroups.set(routeKey, {
                            communications: [],
                            senderLocation: comm.senderLocation,
                            receiverLocation: comm.receiverLocation,
                            sender_location: comm.sender_location,
                            receiver_location: comm.receiver_location
                        });
                    }
                    routeGroups.get(routeKey).communications.push(comm);

                    // Group communications by location for markers
                    if (!locationToMarkers.has(comm.sender_location)) {
                        locationToMarkers.set(comm.sender_location, {
                            communications: [],
                            type: 'sender',
                            coords: comm.senderLocation
                        });
                    }
                    locationToMarkers.get(comm.sender_location).communications.push(comm);

                    if (!locationToMarkers.has(comm.receiver_location)) {
                        locationToMarkers.set(comm.receiver_location, {
                            communications: [],
                            type: 'receiver',
                            coords: comm.receiverLocation
                        });
                    }
                    locationToMarkers.get(comm.receiver_location).communications.push(comm);
                });

                // Create markers for each unique location
                locationToMarkers.forEach((data, location) => {
                    const commCount = data.communications.length;
                    const marker = L.marker([data.coords.latitude, data.coords.longitude], {
                        icon: createMarkerIcon(data.type, commCount),
                        interactive: false, // Make markers non-interactive
                        riseOnHover: false
                    });

                    // Don't bind popup or make markers clickable
                    communicationsClusterGroup.addLayer(marker);
                    communicationMarkers.push(marker);
                });

                // Create arrows for unique routes only
                routeGroups.forEach(routeData => {
                    const senderLat = routeData.senderLocation.latitude;
                    const senderLng = routeData.senderLocation.longitude;
                    const receiverLat = routeData.receiverLocation.latitude;
                    const receiverLng = routeData.receiverLocation.longitude;

                    // Create only one arrow per unique route, regardless of number of communications
                    const arrow = window.markerUtils_createArrow
                        ? window.markerUtils_createArrow([senderLat, senderLng], [receiverLat, receiverLng], routeData.communications[0].type)
                        : createArrow([senderLat, senderLng], [receiverLat, receiverLng], routeData.communications[0].type);

                    communicationLayer.addLayer(arrow);
                });

                // Store markers globally for reference
                window.communicationMarkersArray = communicationMarkers;

                // Fit map to show all communications
                if (communicationMarkers.length > 0) {
                    const group = L.featureGroup(communicationMarkers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }

                // Update communications info panel
                updateAllCommunicationsInfo(communications);
            })
            .catch(error => {
                console.error("Error processing locations:", error);
                alert("Error processing location data. Please try again later.");
            });
        })
        .catch(error => {
            console.error("Error fetching communications:", error);
            alert("Error loading communications. Please try again later.");
        });
}

/**
 * Create popup content for a communication
 * @param {Object} comm - Communication data
 * @param {string} perspective - 'sender' or 'receiver'
 * @returns {string} HTML content for popup
 */
function createCommunicationPopup(comm, perspective) {
    const isSender = perspective === 'sender';
    const name = isSender ? comm.sender : comm.receiver;
    const location = isSender ? comm.sender_location : comm.receiver_location;
    const otherName = isSender ? comm.receiver : comm.sender;
    const direction = isSender ? 'To' : 'From';

    let dateStr = 'Unknown Date';
    if (comm.date) {
        if (comm.date.toDate) {
            // Firestore Timestamp
            const date = comm.date.toDate();
            dateStr = date.toLocaleDateString();
        } else if (typeof comm.date === 'string') {
            // String date
            dateStr = comm.date;
        }
    }

    return `
        <div class="marker-popup">
            <h3>${name || 'Unknown'}</h3>
            <p><strong>Location:</strong> ${location || 'Unknown'}</p>
            <p><strong>${direction}:</strong> ${otherName || 'Unknown'}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
        </div>
    `;
}

/**
 * Create popup content for a location with multiple communications
 * @param {Array} communications - Array of communication data at this location
 * @param {string} type - 'sender' or 'receiver'
 * @param {string} location - Location name
 * @returns {string} HTML content for popup
 */
function createLocationCommunicationPopup(communications, type, location) {
    const uniquePersons = [...new Set(communications.map(comm => 
        type === 'sender' ? comm.sender : comm.receiver
    ))];
    
    const commCount = communications.length;
    const personList = uniquePersons.slice(0, 3).join(', ') + 
        (uniquePersons.length > 3 ? ` and ${uniquePersons.length - 3} others` : '');

    return `
        <div class="marker-popup">
            <h3>${location}</h3>
            <p><strong>Role:</strong> ${type === 'sender' ? 'Sending' : 'Receiving'} location</p>
            <p><strong>Communications:</strong> ${commCount}</p>
            <p><strong>People:</strong> ${personList}</p>
            <div class="communications-list">
                ${communications.slice(0, 5).map(comm => {
                    const otherPerson = type === 'sender' ? comm.receiver : comm.sender;
                    const direction = type === 'sender' ? 'To' : 'From';
                    let dateStr = 'Unknown Date';
                    if (comm.date) {
                        if (comm.date.toDate) {
                            const date = comm.date.toDate();
                            dateStr = date.toLocaleDateString();
                        } else if (typeof comm.date === 'string') {
                            dateStr = comm.date;
                        }
                    }
                    return `
                        <div class="communication-item">
                            <small><strong>${direction}:</strong> ${otherPerson || 'Unknown'}</small>
                            <small><strong>Date:</strong> ${dateStr}</small>
                        </div>
                    `;
                }).join('')}
                ${communications.length > 5 ? `<small><em>... and ${communications.length - 5} more</em></small>` : ''}
            </div>
        </div>
    `;
}

/**
 * Update communications info panel with all communications
 * @param {Array} communications - Array of communication objects
 */
function updateAllCommunicationsInfo(communications) {
    const infoElement = document.getElementById('communications-events');
    if (!infoElement) return;

    infoElement.innerHTML = '';

    if (communications.length === 0) {
        infoElement.innerHTML = '<p>No communications found.</p>';
        return;
    }

    // Sort communications by date
    communications.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.seconds - b.date.seconds;
    });

    // Limit to most recent 20 communications
    const recentCommunications = communications.slice(0, 20);

    recentCommunications.forEach(comm => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';

        let dateStr = 'Unknown Date';
        if (comm.date) {
            if (comm.date.toDate) {
                // Firestore Timestamp
                const date = comm.date.toDate();
                dateStr = date.toLocaleDateString();
            } else if (typeof comm.date === 'string') {
                // String date
                dateStr = comm.date;
            }
        }

        eventItem.innerHTML = `
            <div class="event-date">${dateStr}</div>
            <div class="event-content">
                <p><strong>From:</strong> ${comm.sender || 'Unknown'}</p>
                <p><strong>To:</strong> ${comm.receiver || 'Unknown'}</p>
            </div>
        `;

        infoElement.appendChild(eventItem);
    });
}

/**
 * Format a Firestore timestamp for display
 * @param {Object} timestamp - Firestore timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';

    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Invalid date';
    }
}

/**
 * Create a marker icon based on type with communication count
 * @param {string} type - 'sender' or 'receiver'
 * @param {number} count - Number of communications
 * @returns {L.DivIcon} Leaflet div icon
 */
function createMarkerIcon(type, count) {
    // Different colors and sizes for senders vs receivers
    const config = {
        'sender': {
            color: '#8B4513', // Brown color for senders
            size: 40,         // Bigger size for senders
            fontSize: '14px'
        },
        'receiver': {
            color: '#4169E1', // Royal blue color for receivers
            size: 30,         // Smaller size for receivers
            fontSize: '12px'
        }
    };
    
    const markerConfig = config[type] || config['receiver'];

    return L.divIcon({
        html: `
            <div class="marker-icon marker-${type}" style="background-color: ${markerConfig.color};">
                <span class="marker-count" style="font-size: ${markerConfig.fontSize};">${count}</span>
            </div>
        `,
        className: 'custom-marker non-interactive',
        iconSize: [markerConfig.size, markerConfig.size],
        iconAnchor: [markerConfig.size / 2, markerConfig.size / 2]
    });
}

/**
 * Create a simple line between two points (no arrows)
 * @param {Array} start - Start coordinates [lat, lng]
 * @param {Array} end - End coordinates [lat, lng]
 * @param {string} type - Type of communication
 * @returns {L.Polyline} Simple line between points
 */
function createArrow(start, end, type) {
    // Create just a simple line without arrow markers
    const line = L.polyline([start, end], {
        color: type === 'telegram' ? '#9b59b6' : '#e74c3c',
        weight: 3,
        opacity: 0.8,
        dashArray: type === 'telegram' ? '5, 5' : null // Dashed line for telegrams
    });

    return line;
}

/**
 * Update communications info panel with letters for a specific diplomat
 * @param {Array} letters - Array of letter objects (outgoing only)
 */
function updateCommunicationsInfo(letters) {
    const infoElement = document.getElementById('communications-events');
    if (!infoElement) return;

    infoElement.innerHTML = '';

    console.log("Outgoing letters to display in communications panel:", letters);

    if (letters.length === 0) {
        infoElement.innerHTML = '<p>No outgoing communications found for this diplomat.</p>';
        return;
    }

    // Sort letters by date
    letters.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        if (typeof a.date === 'string' && typeof b.date === 'string') {
            return a.date.localeCompare(b.date);
        }
        return a.date.seconds - b.date.seconds;
    });

    letters.forEach((letter, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';

        // Format date directly here instead of using formatDate function
        let dateStr = 'Unknown Date';
        if (letter.date) {
            if (letter.date.toDate) {
                // Firestore Timestamp
                const date = letter.date.toDate();
                dateStr = date.toLocaleDateString();
            } else if (typeof letter.date === 'string') {
                // String date
                dateStr = letter.date;
            }
        }

        // Since we're only showing outgoing letters, always show "To:"
        eventItem.innerHTML = `
            <div class="event-date">${dateStr}</div>
            <div class="event-content">
                <p><strong>To:</strong> ${letter.receiver || 'Unknown'}</p>
                ${letter.receiver_location ? `<p><small>Location: ${letter.receiver_location}</small></p>` : ''}
            </div>
        `;

        infoElement.appendChild(eventItem);
    });
}

/**
 * Get coordinates for a location name
 * @param {string} locationName - Name of the location
 * @returns {Promise<Object>} Promise resolving to {lat, lng} object
 */
function getLocationCoordinates(locationName) {
    // Initialize cache if not exists
    if (!window.locationCoordinates) {
        window.locationCoordinates = {};
    }

    // Return from cache if available
    if (window.locationCoordinates[locationName]) {
        return Promise.resolve(window.locationCoordinates[locationName]);
    }

    // Use a geocoding service to get coordinates
    // For this example, we'll use a simple mapping of common locations
    const locationMap = {
        'Istanbul': { lat: 41.0082, lng: 28.9784 },
        'Turin': { lat: 45.0703, lng: 7.6869 },
        'Paris': { lat: 48.8566, lng: 2.3522 },
        'London': { lat: 51.5074, lng: -0.1278 },
        'Vienna': { lat: 48.2082, lng: 16.3738 },
        'Rome': { lat: 41.9028, lng: 12.4964 },
        'Berlin': { lat: 52.5200, lng: 13.4050 },
        'Moscow': { lat: 55.7558, lng: 37.6173 },
        'Athens': { lat: 37.9838, lng: 23.7275 },
        'Cairo': { lat: 30.0444, lng: 31.2357 },
        'Genoa': { lat: 44.4056, lng: 8.9463 },
        'Naples': { lat: 40.8518, lng: 14.2681 },
        'Venice': { lat: 45.4408, lng: 12.3155 },
        'Syros': { lat: 37.4500, lng: 24.9167 },
        'Bologna': { lat: 44.4949, lng: 11.3426 }
    };

    // Check if we have the location in our map
    if (locationMap[locationName]) {
        // Cache the result
        window.locationCoordinates[locationName] = locationMap[locationName];
        return Promise.resolve(locationMap[locationName]);
    }

    // If not in our map, return a default location and log a warning
    console.warn(`Location not found in map: ${locationName}. Using default coordinates.`);
    const defaultCoords = { lat: 41.0082, lng: 28.9784 }; // Istanbul as default
    window.locationCoordinates[locationName] = defaultCoords;
    return Promise.resolve(defaultCoords);
}

/**
 * Direct initialization function for testing
 */
function initLetterCommunications() {
    console.log("Manual initialization of letter communications");
    if (window.db && window.communicationsMapInstance) {
        console.log("DB and map instance found, calling fetchDiplomats");
        fetchDiplomats(window.db, window.communicationsMapInstance);
    } else {
        console.error("Missing DB or map instance:", {
            db: !!window.db,
            map: !!window.communicationsMapInstance
        });
    }
}

// Make the function globally available
window.initLetterCommunications = initLetterCommunications;

