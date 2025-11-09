// public/maps-component.js
class MapsComponent {
    constructor() {
        this.apiUrl = 'http://192.168.56.10:3000/api/maps';
        this.apiKey = 'openwebui-maps-integration-2024';
        this.isInitialized = false;
    }

    init(containerId = 'maps-component-container') {
        if (this.isInitialized) return;

        const container = document.getElementById(containerId) || document.body;
        container.innerHTML = this.getTemplate();
        
        this.bindEvents();
        this.isInitialized = true;
        
        console.log('MapsComponent initialized');
        
        // Export to global scope for Open WebUI
        window.MapsComponent = this;
    }

    getTemplate() {
        return `
            <div class="maps-openwebui-component">
                <div class="maps-header">
                    <h3>🔍 Google Maps Search</h3>
                    <p>Find places and get directions</p>
                </div>

                <div class="search-section">
                    <div class="input-group">
                        <input type="text" 
                               id="mapsSearchInput" 
                               class="search-input" 
                               placeholder="Search for restaurants, hotels, attractions..."
                               aria-label="Search places">
                        <button id="searchButton" class="search-btn">
                            <span class="btn-text">Search</span>
                            <span class="spinner hidden"></span>
                        </button>
                    </div>

                    <div class="location-filters">
                        <label>Location:</label>
                        <select id="locationSelect" class="location-select">
                            <option value="new york">New York</option>
                            <option value="los angeles">Los Angeles</option>
                            <option value="chicago">Chicago</option>
                            <option value="miami">Miami</option>
                            <option value="london">London</option>
                            <option value="tokyo">Tokyo</option>
                            <option value="paris">Paris</option>
                            <option value="sydney">Sydney</option>
                        </select>

                        <label>Category:</label>
                        <select id="categorySelect" class="category-select">
                            <option value="">All Categories</option>
                            <option value="restaurant">Restaurants</option>
                            <option value="cafe">Coffee Shops</option>
                            <option value="hotel">Hotels</option>
                            <option value="park">Parks</option>
                            <option value="museum">Museums</option>
                            <option value="store">Stores</option>
                        </select>
                    </div>
                </div>

                <div id="resultsContainer" class="results-container hidden">
                    <div class="results-header">
                        <h4>Search Results</h4>
                        <button id="copyToChat" class="copy-btn">Copy to Chat</button>
                    </div>
                    <div id="resultsList" class="results-list"></div>
                </div>

                <div id="errorContainer" class="error-container hidden"></div>

                <div class="integration-guide">
                    <h4>Open WebUI Integration</h4>
                    <p>Use this component in your Open WebUI instance by including:</p>
                    <code class="integration-code">
// Add to Open WebUI custom components<br>
const mapsApi = 'http://192.168.56.10:3000';<br>
// Use fetch() to call /api/maps/search endpoint
                    </code>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const searchInput = document.getElementById('mapsSearchInput');
        const searchButton = document.getElementById('searchButton');
        const locationSelect = document.getElementById('locationSelect');
        const categorySelect = document.getElementById('categorySelect');
        const copyToChatBtn = document.getElementById('copyToChat');

        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchPlaces();
        });

        searchButton?.addEventListener('click', () => this.searchPlaces());
        copyToChatBtn?.addEventListener('click', () => this.copyResultsToChat());

        // Add real-time search suggestions
        searchInput?.addEventListener('input', (e) => {
            this.handleSearchSuggestions(e.target.value);
        });
    }

    async searchPlaces() {
        const searchInput = document.getElementById('mapsSearchInput');
        const locationSelect = document.getElementById('locationSelect');
        const categorySelect = document.getElementById('categorySelect');
        const searchButton = document.getElementById('searchButton');
        const btnText = searchButton?.querySelector('.btn-text');
        const spinner = searchButton?.querySelector('.spinner');

        const query = searchInput?.value.trim();
        if (!query) {
            this.showError('Please enter a search query');
            return;
        }

        // Show loading state
        btnText?.classList.add('hidden');
        spinner?.classList.remove('hidden');
        searchButton.disabled = true;

        try {
            const location = locationSelect?.value || 'new york';
            const category = categorySelect?.value || '';

            const response = await fetch(`${this.apiUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                },
                body: JSON.stringify({
                    query: query,
                    location: await this.getLocationCoordinates(location),
                    type: category || null,
                    radius: 5000
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayResults(data);
            } else {
                throw new Error(data.error || 'Search failed');
            }

        } catch (error) {
            console.error('Search error:', error);
            this.showError(`Search failed: ${error.message}`);
        } finally {
            // Reset loading state
            btnText?.classList.remove('hidden');
            spinner?.classList.add('hidden');
            searchButton.disabled = false;
        }
    }

    async getLocationCoordinates(location) {
        try {
            const response = await fetch(`${this.apiUrl}/geocode?location=${encodeURIComponent(location)}`, {
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            const data = await response.json();
            return data.coordinates;
        } catch (error) {
            // Fallback coordinates
            const fallback = {
                'new york': '40.7128,-74.0060',
                'los angeles': '34.0522,-118.2437',
                'chicago': '41.8781,-87.6298',
                'miami': '25.7617,-80.1918',
                'london': '51.5074,-0.1278',
                'tokyo': '35.6762,139.6503',
                'paris': '48.8566,2.3522',
                'sydney': '-33.8688,151.2093'
            };
            return fallback[location] || fallback['new york'];
        }
    }

    displayResults(data) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsList = document.getElementById('resultsList');
        const errorContainer = document.getElementById('errorContainer');

        errorContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        if (!data.places || data.places.length === 0) {
            resultsList.innerHTML = `
                <div class="no-results">
                    <p>No places found. Try a different search term.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Add static map if available
        if (data.static_map_url) {
            html += `
                <div class="static-map-container">
                    <img src="${data.static_map_url}" alt="Location Map" class="static-map">
                </div>
            `;
        }

        // Add places
        data.places.forEach((place, index) => {
            const rating = place.rating ? place.rating.toFixed(1) : 'N/A';
            const isOpen = place.opening_hours ? place.opening_hours.open_now : null;
            const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.formatted_address)}`;

            html += `
                <div class="place-card" data-place-id="${place.place_id}">
                    <div class="place-header">
                        <h4 class="place-name">${index + 1}. ${place.name}</h4>
                        <div class="place-meta">
                            <span class="rating">⭐ ${rating}</span>
                            ${isOpen !== null ? `
                                <span class="status ${isOpen ? 'open' : 'closed'}">
                                    ${isOpen ? '🟢 Open' : '🔴 Closed'}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <p class="place-address">📍 ${place.formatted_address}</p>
                    
                    <div class="place-actions">
                        <a href="${mapsUrl}" target="_blank" class="action-btn map-view">
                            🗺️ View Map
                        </a>
                        <a href="${directionsUrl}" target="_blank" class="action-btn directions">
                            🚗 Directions
                        </a>
                        <button class="action-btn details" onclick="MapsComponent.showPlaceDetails('${place.place_id}')">
                            ℹ️ Details
                        </button>
                    </div>
                </div>
            `;
        });

        resultsList.innerHTML = html;

        // Store results for chat integration
        this.lastResults = data;
    }

    async showPlaceDetails(placeId) {
        try {
            const response = await fetch(`${this.apiUrl}/place/${placeId}`, {
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayPlaceDetails(data.place);
            }
        } catch (error) {
            console.error('Details error:', error);
            this.showError('Failed to load place details');
        }
    }

    displayPlaceDetails(place) {
        // Create a modal or detailed view
        const detailsHtml = `
            <div class="place-details">
                <h4>${place.name}</h4>
                <p><strong>Address:</strong> ${place.formatted_address}</p>
                <p><strong>Rating:</strong> ${place.rating || 'N/A'}</p>
                ${place.formatted_phone_number ? `<p><strong>Phone:</strong> ${place.formatted_phone_number}</p>` : ''}
                ${place.website ? `<p><strong>Website:</strong> <a href="${place.website}" target="_blank">${place.website}</a></p>` : ''}
            </div>
        `;
        
        // You could implement a modal here
        alert(`Place Details:\n\n${place.name}\n${place.formatted_address}\nRating: ${place.rating || 'N/A'}`);
    }

    copyResultsToChat() {
        if (!this.lastResults) return;
        
        const llmResponse = this.lastResults.llm_response;
        
        // Copy to clipboard
        navigator.clipboard.writeText(llmResponse).then(() => {
            // Show success message
            const copyBtn = document.getElementById('copyToChat');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
        });

        // If in Open WebUI environment, send directly to chat
        if (typeof window.openWebUI !== 'undefined') {
            window.openWebUI.sendMessage(llmResponse);
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        
        setTimeout(() => {
            errorContainer.classList.add('hidden');
        }, 5000);
    }

    handleSearchSuggestions(query) {
        // Implement search suggestions if needed
        console.log('Search suggestion for:', query);
    }
}

// Initialize and export
const mapsComponent = new MapsComponent();

// Export for ES modules
export function init(containerId) {
    return mapsComponent.init(containerId);
}

export default mapsComponent;
