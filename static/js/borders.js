// Ottoman Empire borders variables
let bordersLayer = null;
let bordersVisible = true; // Set to true by default

// Initialize Ottoman borders functionality
function initBorders() {
    // Load the borders GeoJSON data
    fetch('/static/borders.geojson')
        .then(response => response.json())
        .then(data => {
            // Extract year information from the GeoJSON properties
            const yearInfo = data.features[0].properties['name:en'] || 'Ottoman Empire';

            // Store the borders layer and add it to the map by default
            bordersLayer = L.geoJSON(data, {
                style: {
                    color: "#4B3E2A", // Primary color for Ottoman borders
                    weight: 2.5,
                    opacity: 0.8,
                    fillOpacity: 0.08,
                    fillColor: "#A67B5B", // Secondary color for fill
                    dashArray: '5, 5' // Dashed line style
                },
                onEachFeature: function(feature, layer) {
                    // Add a label to the center of the Ottoman Empire
                    const bounds = layer.getBounds();
                    const center = bounds.getCenter();

                    // Create a label with the empire name and year
                    // Responsive label size based on screen width
                    let labelWidth = 220;
                    let labelHeight = 50;

                    if (window.innerWidth <= 768) {
                        labelWidth = 180;
                        labelHeight = 40;
                    }
                    if (window.innerWidth <= 480) {
                        labelWidth = 140;
                        labelHeight = 35;
                    }

                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'ottoman-label',
                            html: `<div>${yearInfo}</div>`,
                            iconSize: [labelWidth, labelHeight],
                            iconAnchor: [labelWidth/2, labelHeight/2]
                        })
                    }).addTo(map);

                    // Store the label with the layer for toggling
                    layer.empireLabel = label;
                }
            });

            // Add borders to map by default
            bordersLayer.addTo(map);

            // Update the button text to reflect that borders are shown
            document.getElementById('toggle-borders').innerText = "Hide Ottoman Borders";

            // Enable the toggle button now that borders are loaded
            document.getElementById('toggle-borders').disabled = false;
        })
        .catch(error => {
            console.error("Error loading borders data:", error);
            document.getElementById('toggle-borders').innerText = "Borders Unavailable";
            document.getElementById('toggle-borders').disabled = true;
        });

    // Toggle borders button functionality
    document.getElementById('toggle-borders').addEventListener('click', function() {
        if (!bordersLayer) return; // Don't do anything if borders haven't loaded

        if (bordersVisible) {
            // Remove borders and labels
            bordersLayer.eachLayer(function(layer) {
                if (layer.empireLabel) {
                    map.removeLayer(layer.empireLabel);
                }
            });
            map.removeLayer(bordersLayer);
            this.innerText = "Show Ottoman Borders";
        } else {
            // Add borders and labels
            bordersLayer.addTo(map);
            bordersLayer.eachLayer(function(layer) {
                if (layer.empireLabel) {
                    layer.empireLabel.addTo(map);
                }
            });
            this.innerText = "Hide Ottoman Borders";
        }

        bordersVisible = !bordersVisible;
    });
}
