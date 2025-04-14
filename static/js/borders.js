// Ottoman Empire borders variables
let bordersLayer = null;
let bordersVisible = false;

// Initialize Ottoman borders functionality
function initBorders() {
    // Load the borders GeoJSON data
    fetch('/static/borders.geojson')
        .then(response => response.json())
        .then(data => {
            // Store the borders layer but don't add it to the map yet
            bordersLayer = L.geoJSON(data, {
                style: {
                    color: "#800000", // Maroon color for Ottoman borders
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.1
                }
            });
            
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
            map.removeLayer(bordersLayer);
            this.innerText = "Show Ottoman Borders";
        } else {
            bordersLayer.addTo(map);
            this.innerText = "Hide Ottoman Borders";
        }
        
        bordersVisible = !bordersVisible;
    });
}
