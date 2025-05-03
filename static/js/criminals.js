// Global variable to store all criminals data
let allCriminals = [];

// Fetch all criminals data from Firestore
function fetchCriminals() {
    db.collection('criminals').get().then((querySnapshot) => {
        allCriminals = querySnapshot.docs.map(doc => {
            return {
                id: doc.id,
                ...doc.data()
            };
        });

        // Populate the criminals table and portraits gallery
        populateCriminalsTable();
        populateCriminalPortraits();
    }).catch(error => {
        console.error("Error fetching criminals:", error);
    });
}

// Populate the criminals table with data
function populateCriminalsTable() {
    const tableBody = document.getElementById('criminals-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    allCriminals.forEach(criminal => {
        const row = document.createElement('tr');

        // Format the date
        let birthDateStr = criminal.birthdate || 'Unknown';

        // Find arrest event
        const arrestEvent = allMarkers
            .filter(marker => marker.documentData.criminalId === criminal.id && marker.documentData.type === 'arrest')
            .map(marker => marker.documentData)[0];

        const arrestLocation = arrestEvent ? arrestEvent.location : 'Unknown';

        // Create table row
        row.innerHTML = `
            <td><a href="#" class="criminal-link" data-id="${criminal.id}">${criminal.name || 'Unknown'}</a></td>
            <td>${birthDateStr}</td>
            <td>${criminal.birthplace || 'Unknown'}</td>
            <td>${criminal.nation || 'Unknown'}</td>
            <td>${criminal.prof || 'Unknown'}</td>
            <td>${arrestLocation}</td>
        `;

        tableBody.appendChild(row);
    });

    // Add event listeners to criminal links
    document.querySelectorAll('.criminal-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const criminalId = this.getAttribute('data-id');
            showCriminalDetails(criminalId);
        });
    });
}

// Populate the criminal portraits gallery
function populateCriminalPortraits() {
    const portraitsContainer = document.getElementById('criminal-portraits');
    if (!portraitsContainer) return;

    portraitsContainer.innerHTML = '';

    // Filter criminals that have physical descriptions
    const criminalsWithDescriptions = allCriminals.filter(criminal =>
        criminal.physicalDescription && criminal.physicalDescription.trim() !== '');

    if (criminalsWithDescriptions.length === 0) {
        portraitsContainer.innerHTML = '<p class="no-portraits">No physical descriptions available for AI portrait generation.</p>';
        return;
    }

    criminalsWithDescriptions.forEach(criminal => {
        // Create portrait card
        const card = document.createElement('div');
        card.className = 'criminal-portrait-card';
        card.setAttribute('data-id', criminal.id);

        // Use placeholder image or AI-generated image if available
        const portraitUrl = criminal.portraitUrl || '/static/images/criminal-placeholder.jpg';

        card.innerHTML = `
            <img src="${portraitUrl}" alt="${criminal.name}" class="portrait-image">
            <div class="portrait-info">
                <h4 class="portrait-name">${criminal.name}</h4>
                <p class="portrait-description">Click to view physical description</p>
            </div>
        `;

        // Add click event to show details
        card.addEventListener('click', function() {
            showCriminalDetails(criminal.id);
        });

        portraitsContainer.appendChild(card);
    });
}

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

            // Add physical description if available
            if (criminalData.physicalDescription && criminalData.physicalDescription.trim() !== '') {
                const physicalDescHeader = document.createElement('h3');
                physicalDescHeader.innerText = 'Physical Description (Portrait Parlé)';
                detailsDiv.appendChild(physicalDescHeader);

                const physicalDesc = document.createElement('p');
                physicalDesc.innerHTML = criminalData.physicalDescription;
                detailsDiv.appendChild(physicalDesc);
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
