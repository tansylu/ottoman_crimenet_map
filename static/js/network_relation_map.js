// Criminal Network Relation Map
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const firebaseConfig = JSON.parse(document.getElementById('firebase-config').textContent);
    const app = firebase.initializeApp(firebaseConfig);
    const db = app.firestore();

    // Network color mapping (keeping original colors)
    const colors = {
        "network_1": "#e74c3c", // Red
        "network_2": "#3498db", // Blue
        "network_3": "#2ecc71", // Green
        "network_4": "#e67e22", // Orange (changed from yellow for better visibility)
        "network_5": "#9b59b6", // Purple
        "network_6": "#8B4513", // Brown
        "unknown": "#999999"  // Gray
    };

    // Network descriptions (will be updated from Firestore if available)
    let networkDescriptions = {
        "network_1": "Primary Forgery Network",
        "network_2": "Secondary Criminal Group",
        "network_3": "Support Network",
        "network_4": "Distribution Network",
        "network_5": "Financial Network",
        "network_6": "Peripheral Associates",
        "unknown": "Unknown Network"
    };

    // Update button text with descriptions
    document.addEventListener('DOMContentLoaded', function() {
        // After network descriptions are loaded from Firestore
        db.collection("network_descriptions").get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const networkId = doc.id;
                const description = doc.data().description;
                
                if (description) {
                    networkDescriptions[networkId] = description;
                    
                    // Update button text
                    const button = document.querySelector(`.filter-btn[data-network="${networkId}"]`);
                    if (button) {
                        button.textContent = description;
                    }
                }
            });
            
            console.log("Network descriptions loaded:", networkDescriptions);
        }).catch((error) => {
            console.error("Error loading network descriptions:", error);
        });
    });

    // Initialize the map
    const map = L.map('relation-map').setView([41.0370, 28.9866], 14);

    // Add the base tile layer with a grayscale filter for black and white look
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'grayscale-tiles' // Add a class for styling
    }).addTo(map);

    // Add CSS for the grayscale filter
    const style = document.createElement('style');
    style.textContent = `
        .grayscale-tiles {
            filter: grayscale(100%) brightness(0.9) contrast(1.1);
        }
    `;
    document.head.appendChild(style);

    // Add CSS for the criminal name labels
    const labelStyle = document.createElement('style');
    labelStyle.textContent = `
        .criminal-label {
            background: none;
            border: none;
        }
        .criminal-name {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            font-weight: bold;
            text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
            white-space: nowrap;
            pointer-events: auto;
        }
    `;
    document.head.appendChild(labelStyle);

    // Initialize the modal
    const modal = document.getElementById("criminal-modal");
    const closeBtn = document.querySelector(".close");

    // These will be overridden in the showCriminalDetails function
    // to include resetHighlights, but we set defaults here
    closeBtn.onclick = function() {
        modal.style.display = "none";
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // Variables to store markers and connections
    let allMarkers = [];
    let connections = [];
    let criminalsByNetwork = {};
    let criminalsById = {};
    let currentFilter = 'all';

    // Try to fetch network descriptions from relations collection
    db.collection('relations').get().then(snapshot => {
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.network && data.description) {
                networkDescriptions[data.network] = data.description;
            }
        });
        console.log("Network descriptions loaded:", networkDescriptions);
    }).catch(error => {
        console.warn("Could not load network descriptions:", error);
        console.log("Using default network descriptions");
    });

    // Fetch criminals data
    db.collection('criminals').get().then(snapshot => {
        // Initialize network groups
        for (let i = 1; i <= 6; i++) {
            criminalsByNetwork[`network_${i}`] = [];
        }

        // Process criminals data
        snapshot.forEach(doc => {
            const data = doc.data();
            const criminalId = doc.id;

            // Skip criminals without coordinates
            if (!data.coordinates) return;

            // Create criminal object
            const criminal = {
                id: criminalId,
                name: data.name || 'Unknown',
                network: data.network || 'unknown',
                birthplace: data.birthplace || 'Unknown',
                birthdate: data.birthdate || 'Unknown',
                profession: data.prof || 'Unknown',
                nationality: data.nation || 'Unknown',
                location: data.location || 'Unknown',
                alias: data.alias || '',
                coordinates: data.coordinates
            };

            // Store criminal by ID
            criminalsById[criminalId] = criminal;

            // Add to network group
            if (criminal.network && criminal.network.startsWith('network_')) {
                criminalsByNetwork[criminal.network].push(criminal);
            }

            // Create marker for this criminal
            const marker = L.marker(
                [data.coordinates.lat, data.coordinates.lng],
                {
                    icon: L.divIcon({
                        className: 'criminal-label',
                        html: `<div class="criminal-name" style="color: ${colors[criminal.network] || colors.unknown};">${criminal.name}</div>`,
                        iconSize: [100, 20],
                        iconAnchor: [50, 10]
                    })
                }
            );

            // Add data to marker
            marker.criminalId = criminalId;
            marker.network = criminal.network;

            // No need for tooltip since we're showing names directly
            // marker.bindTooltip(name, {...});

            // Add click event
            marker.on('click', function() {
                showCriminalDetails(criminal);
            });

            // Add to markers array
            allMarkers.push(marker);

            // Add to map
            marker.addTo(map);
        });

        // Create connections between criminals in the same network
        Object.keys(criminalsByNetwork).forEach(network => {
            const criminals = criminalsByNetwork[network];

            if (criminals.length > 1) {
                // Instead of connecting all criminals to each other, we'll create a more limited set of connections
                // This will create a more manageable network and improve performance

                // Sort criminals by location to connect nearby criminals
                criminals.sort((a, b) => {
                    if (!a.coordinates || !b.coordinates) return 0;
                    return a.coordinates.lat - b.coordinates.lat;
                });

                // Connect each criminal to at most 3 closest criminals in the same network
                for (let i = 0; i < criminals.length; i++) {
                    const criminal1 = criminals[i];

                    // Find the closest criminals
                    const closestCriminals = findClosestCriminals(criminal1, criminals, 3);

                    // Create connections to closest criminals
                    closestCriminals.forEach(criminal2 => {
                        // Create polyline connection with black solid lines for B&W theme
                        const connection = L.polyline(
                            [
                                [criminal1.coordinates.lat, criminal1.coordinates.lng],
                                [criminal2.coordinates.lat, criminal2.coordinates.lng]
                            ],
                            {
                                color: '#000000', // Black for B&W theme
                                weight: 2, // Slightly thinner for cleaner look
                                opacity: 0.7, // Slightly transparent
                                dashArray: null // Solid line instead of dashed
                            }
                        );

                        // Add network info to connection
                        connection.network = network;

                        // Add to connections array
                        connections.push(connection);

                        // Add to map
                        connection.addTo(map);
                    });
                }
            }
        });

        // Helper function to find closest criminals
        function findClosestCriminals(criminal, criminals, count) {
            if (!criminal.coordinates) return [];

            // Calculate distances to other criminals
            const distances = [];
            for (let i = 0; i < criminals.length; i++) {
                const otherCriminal = criminals[i];

                // Skip self or criminals without coordinates
                if (otherCriminal.id === criminal.id || !otherCriminal.coordinates) continue;

                // Calculate distance
                const distance = calculateDistance(
                    criminal.coordinates.lat, criminal.coordinates.lng,
                    otherCriminal.coordinates.lat, otherCriminal.coordinates.lng
                );

                distances.push({ criminal: otherCriminal, distance });
            }

            // Sort by distance
            distances.sort((a, b) => a.distance - b.distance);

            // Return the closest criminals (up to count)
            return distances.slice(0, count).map(d => d.criminal);
        }

        // Helper function to calculate distance between two points
        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Radius of the earth in km
            const dLat = deg2rad(lat2 - lat1);
            const dLon = deg2rad(lon2 - lon1);
            const a =
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c; // Distance in km
            return d;
        }

        function deg2rad(deg) {
            return deg * (Math.PI/180);
        }

        // Set up filter buttons
        setupFilterButtons();

    }).catch(error => {
        console.error("Error fetching criminals data:", error);
    });

    // Function to set up filter buttons
    function setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));

                // Add active class to clicked button
                this.classList.add('active');

                // Get network to filter by
                const network = this.dataset.network;
                currentFilter = network;

                // Filter markers and connections
                filterMarkers(network);
            });
        });
    }

    // Function to filter markers and connections
    function filterMarkers(network) {
        // Filter markers
        allMarkers.forEach(marker => {
            // If 'all' is selected or marker's network matches the filter
            const match = (network === 'all' || marker.network === network);

            if (match) {
                // Make sure it's on the map
                if (!map.hasLayer(marker)) {
                    marker.addTo(map);
                }
            } else {
                // Remove from map
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            }
        });

        // Filter connections
        connections.forEach(connection => {
            // If 'all' is selected or connection's network matches the filter
            const match = (network === 'all' || connection.network === network);

            if (match) {
                // Show connection with black color for B&W theme
                connection.setStyle({
                    color: '#000000', // Black for B&W theme
                    weight: 2, // Slightly thinner for cleaner look
                    opacity: 0.7, // Slightly transparent
                    dashArray: null // Solid line
                });
                
                // Make sure it's on the map
                if (!map.hasLayer(connection)) {
                    connection.addTo(map);
                }
            } else {
                // Remove from map
                if (map.hasLayer(connection)) {
                    map.removeLayer(connection);
                }
            }
        });
    }

    // Variables to track highlighted elements
    let highlightedMarkers = [];
    let highlightedConnections = [];
    let originalMarkerStyles = {};
    let originalConnectionStyles = {};

    // Function to show criminal details in the modal
    function showCriminalDetails(criminal) {
        const modalTitle = document.getElementById("modal-title");
        const modalDetails = document.getElementById("modal-details");
        const modalRelations = document.getElementById("modal-relations");

        // Reset any previously highlighted elements
        resetHighlights();

        // Set the title
        modalTitle.textContent = criminal.name;

        // Set the details
        let detailsHTML = `
            <p><strong>Network:</strong> ${criminal.network || 'Unknown'}</p>
            <p><strong>Network Description:</strong> ${networkDescriptions[criminal.network] || 'No description available'}</p>
            <p><strong>Birthplace:</strong> ${criminal.birthplace || 'Unknown'}</p>
            <p><strong>Birth Date:</strong> ${criminal.birthdate || 'Unknown'}</p>
            <p><strong>Profession:</strong> ${criminal.profession || 'Unknown'}</p>
            <p><strong>Nationality:</strong> ${criminal.nationality || 'Unknown'}</p>
            <p><strong>Location:</strong> ${criminal.location || 'Unknown'}</p>
        `;

        if (criminal.alias) {
            detailsHTML += `<p><strong>Alias:</strong> ${criminal.alias}</p>`;
        }

        modalDetails.innerHTML = detailsHTML;

        // Find direct relations (criminals with connections to this criminal)
        // This will only show criminals that have a direct connection
        const directRelations = [];
        const directConnections = [];

        // Highlight the selected criminal's marker
        const selectedMarker = allMarkers.find(marker =>
            marker.criminalId === criminal.id
        );

        if (selectedMarker) {
            // Store original style
            originalMarkerStyles[criminal.id] = {
                radius: selectedMarker.options.radius,
                fillOpacity: selectedMarker.options.fillOpacity,
                weight: selectedMarker.options.weight
            };

            // Highlight the marker
            selectedMarker.setStyle({
                radius: 8,
                fillOpacity: 1,
                weight: 2
            });

            highlightedMarkers.push(selectedMarker);
        }

        // Check all connections to find direct relations
        connections.forEach(connection => {
            // Get the coordinates of both endpoints of the connection
            const points = connection.getLatLngs();
            const criminalCoords = [criminal.coordinates.lat, criminal.coordinates.lng];

            // Check if this criminal is one of the endpoints
            const isEndpoint1 = Math.abs(points[0].lat - criminalCoords[0]) < 0.0001 &&
                               Math.abs(points[0].lng - criminalCoords[1]) < 0.0001;
            const isEndpoint2 = Math.abs(points[1].lat - criminalCoords[0]) < 0.0001 &&
                               Math.abs(points[1].lng - criminalCoords[1]) < 0.0001;

            if (isEndpoint1 || isEndpoint2) {
                // Find the other criminal in this connection
                const otherPoint = isEndpoint1 ? points[1] : points[0];

                // Find the criminal with these coordinates
                const relatedCriminal = Object.values(criminalsById).find(c =>
                    c.coordinates &&
                    Math.abs(c.coordinates.lat - otherPoint.lat) < 0.0001 &&
                    Math.abs(c.coordinates.lng - otherPoint.lng) < 0.0001
                );

                if (relatedCriminal && !directRelations.some(r => r.id === relatedCriminal.id)) {
                    directRelations.push(relatedCriminal);
                    directConnections.push(connection);

                    // Highlight the related criminal's marker
                    const relatedMarker = allMarkers.find(marker =>
                        marker.criminalId === relatedCriminal.id
                    );

                    if (relatedMarker) {
                        // Store original style
                        originalMarkerStyles[relatedCriminal.id] = {
                            radius: relatedMarker.options.radius,
                            fillOpacity: relatedMarker.options.fillOpacity,
                            weight: relatedMarker.options.weight
                        };

                        // Highlight the marker
                        relatedMarker.setStyle({
                            radius: 7,
                            fillOpacity: 0.9,
                            weight: 2
                        });

                        highlightedMarkers.push(relatedMarker);
                    }

                    // Highlight the connection
                    originalConnectionStyles[connection._leaflet_id] = {
                        weight: connection.options.weight,
                        opacity: connection.options.opacity,
                        dashArray: connection.options.dashArray
                    };

                    connection.setStyle({
                        weight: 4, // Increased from 2 to 4 for even bolder highlighted lines
                        opacity: 1.0, // Fully opaque when highlighted
                        dashArray: null // Solid line
                    });

                    highlightedConnections.push(connection);
                }
            }
        });

        // Dim all other markers and connections
        allMarkers.forEach(marker => {
            if (!highlightedMarkers.includes(marker)) {
                marker.setStyle({
                    fillOpacity: 0.2,
                    opacity: 0.2
                });
            }
        });

        connections.forEach(connection => {
            if (!highlightedConnections.includes(connection)) {
                connection.setStyle({
                    opacity: 0.1
                });
            }
        });

        // Relations section is already hidden in the HTML

        // Show the modal
        modal.style.display = "block";

        // When the modal is closed, reset the highlights
        closeBtn.onclick = function() {
            modal.style.display = "none";
            resetHighlights();
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
                resetHighlights();
            }
        };
    }

    // Function to reset highlights
    function resetHighlights() {
        // Reset highlighted connections
        highlightedConnections.forEach(connection => {
            const originalStyle = originalConnectionStyles[connection._leaflet_id];
            if (originalStyle) {
                connection.setStyle(originalStyle);
            } else {
                connection.setStyle({
                    color: '#000000', // Black for B&W theme
                    weight: 2,
                    opacity: 0.7,
                    dashArray: null // Solid line
                });
            }
        });

        // Reset all other connections
        connections.forEach(connection => {
            if (!highlightedConnections.includes(connection)) {
                connection.setStyle({
                    color: '#000000', // Black for B&W theme
                    weight: 2,
                    opacity: 0.7,
                    dashArray: null // Solid line
                });
            }
        });

        // Clear the arrays
        highlightedMarkers = [];
        highlightedConnections = [];
        originalMarkerStyles = {};
        originalConnectionStyles = {};
    }
});
