// Show criminal details in modal
function showCriminalDetails(criminalId) {
    db.collection('criminals').doc(criminalId).get().then((doc) => {
        if (doc.exists) {
            const criminalData = doc.data();
            
            // Populate modal with criminal data
            document.getElementById('modal-name').innerText = criminalData.name || 'Unknown';
            
            const detailsDiv = document.getElementById('modal-details');
            detailsDiv.innerHTML = '';
            
            // Add all criminal details
            if (criminalData.birthdate) {
                const birthDate = document.createElement('p');
                birthDate.innerHTML = `<strong>Birth Year:</strong> ${criminalData.birthdate}`;
                detailsDiv.appendChild(birthDate);
            }
            
            if (criminalData.birthplace) {
                const birthPlace = document.createElement('p');
                birthPlace.innerHTML = `<strong>Birth Place:</strong> ${criminalData.birthplace}`;
                detailsDiv.appendChild(birthPlace);
            }
            
            if (criminalData.prof && criminalData.prof.trim() !== '') {
                const occupation = document.createElement('p');
                occupation.innerHTML = `<strong>Occupation:</strong> ${criminalData.prof}`;
                detailsDiv.appendChild(occupation);
            }
            
            if (criminalData.placeofprof && criminalData.placeofprof.trim() !== '') {
                const placeOfProf = document.createElement('p');
                placeOfProf.innerHTML = `<strong>Place of Profession:</strong> ${criminalData.placeofprof}`;
                detailsDiv.appendChild(placeOfProf);
            }
            
            if (criminalData.nation && criminalData.nation.trim() !== '') {
                const nation = document.createElement('p');
                nation.innerHTML = `<strong>Nationality:</strong> ${criminalData.nation}`;
                detailsDiv.appendChild(nation);
            }
            
            if (criminalData.alias && criminalData.alias.trim() !== '') {
                const alias = document.createElement('p');
                alias.innerHTML = `<strong>Alias:</strong> ${criminalData.alias}`;
                detailsDiv.appendChild(alias);
            }
            
            // Add additional information about events
            const eventsHeader = document.createElement('h3');
            eventsHeader.innerText = 'Timeline';
            detailsDiv.appendChild(eventsHeader);
            
            const eventsList = document.createElement('ul');
            detailsDiv.appendChild(eventsList);
            
            // Find and sort all events related to this criminal
            const relatedEvents = allMarkers
                .filter(marker => marker.documentData.criminalId === criminalId)
                .map(marker => marker.documentData)
                .sort((a, b) => {
                    if (a.date.year !== b.date.year) return a.date.year - b.date.year;
                    if (a.date.month && b.date.month && a.date.month !== b.date.month) return a.date.month - b.date.month;
                    if (a.date.day && b.date.day) return a.date.day - b.date.day;
                    return 0;
                });
            
            if (relatedEvents.length === 0) {
                const noEvents = document.createElement('p');
                noEvents.innerText = 'No events found for this criminal.';
                eventsList.appendChild(noEvents);
            } else {
                relatedEvents.forEach(event => {
                    const eventItem = document.createElement('li');
                    
                    // Format the date with month name
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
                    
                    eventItem.innerHTML = `<strong>${dateStr}:</strong> ${event.type.charAt(0).toUpperCase() + event.type.slice(1)} at ${event.location}${event.description && event.description.trim() !== '' ? ' - ' + event.description : ''}`;
                    eventsList.appendChild(eventItem);
                });
            }
            
            // Show the modal
            document.getElementById('criminal-modal').style.display = 'block';
        } else {
            console.log("No criminal found with ID:", criminalId);
            alert(`No criminal found with ID: ${criminalId}`);
        }
    }).catch(error => {
        console.error("Error getting criminal:", error);
        alert("Error retrieving criminal details. Please try again.");
    });
}

// Initialize modal event listeners
function initCriminalModal() {
    // Modal close button functionality
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('criminal-modal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('criminal-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}
