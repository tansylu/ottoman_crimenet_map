// Time slider variables
const START_YEAR = 1854;
const END_YEAR = 1900;
let currentYear = START_YEAR;
let timeSlider;

// Initialize the time slider
function initTimeSlider() {
    timeSlider = document.getElementById('time-slider');
    noUiSlider.create(timeSlider, {
        start: START_YEAR,
        connect: 'lower',
        step: 1,
        range: {
            'min': START_YEAR,
            'max': END_YEAR
        },
        format: {
            to: value => Math.round(value),
            from: value => Math.round(value)
        }
    });

    // Update year display when slider changes
    timeSlider.noUiSlider.on('update', function(values, handle) {
        currentYear = parseInt(values[handle]);
        document.getElementById('current-year').innerText = currentYear;
        
        // Only call updateMarkers if markers have been loaded
        if (allMarkers.length > 0) {
            updateMarkers();
        }
    });
}
