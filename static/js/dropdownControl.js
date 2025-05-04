// Ottoman Crime Network Map - Dropdown Control Module

/**
 * Control the height of dropdown menus
 * This script helps limit the height of the criminal selector dropdown
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get the criminal selector
    const criminalSelector = document.getElementById('criminal-selector');
    
    if (criminalSelector) {
        // Set the size attribute to control dropdown height
        criminalSelector.setAttribute('size', '1');
        
        // Add event listeners to control dropdown behavior
        criminalSelector.addEventListener('mousedown', function(e) {
            // When the dropdown is clicked, set size to show multiple options
            if (this.size === 1) {
                // Calculate how many options to show (max 10)
                const optionCount = Math.min(this.options.length, 10);
                this.size = optionCount;
                this.focus();
            }
        });
        
        criminalSelector.addEventListener('blur', function() {
            // When focus is lost, reset to single option view
            this.size = 1;
        });
        
        criminalSelector.addEventListener('change', function() {
            // When an option is selected, reset to single option view
            this.size = 1;
        });
    }
});
