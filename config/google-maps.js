// config/google-maps.js
import axios from 'axios';
import dotenv from 'dotenv';

import NodeCache from 'node-cache';

dotenv.config();

class GoogleMapsService {
  constructor(apiKey) {
    // API key is now passed from the routes
    this.apiKey = apiKey;
    
    console.log('🔑 GoogleMapsService Initialization:');
    console.log('   API Key Provided:', !!this.apiKey);
    console.log('   API Key Length:', this.apiKey ? this.apiKey.length : 'N/A');
    console.log('   API Key Prefix:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'N/A');
    
    if (!this.apiKey) {
      console.error('❌ CRITICAL: No API key provided to GoogleMapsService!');
    }
    
    this.baseURL = 'https://maps.googleapis.com/maps/api';
    this.cache = new NodeCache({ stdTTL: 3600 });
  }

  async searchPlaces(query, location = null, radius = 5000, type = null) {
    // Check if API key is available
    if (!this.apiKey) {
      throw new Error('No API key available for Google Maps API');
    }

    const cacheKey = `search:${JSON.stringify({ query, location, radius, type })}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Serving from cache:', query);
      return cached;
    }

    try {
      console.log('🔍 Making Google Maps API request for:', query);
      
      const params = {
        key: this.apiKey,
        query: query,
        radius: radius
      };

      if (location) {
        params.location = location;
      }

      if (type) {
        params.type = type;
      }

      console.log('📤 API Request params:', {
        query: query,
        location: location,
        radius: radius,
        type: type,
        has_api_key: !!this.apiKey
      });

      const response = await axios.get(`${this.baseURL}/place/textsearch/json`, {
        params: params,
        timeout: 15000
      });

      console.log('📥 API Response status:', response.data.status);
      console.log('📥 API Response results:', response.data.results?.length || 0);

      if (response.data.status === 'OK') {
        const results = response.data.results.slice(0, 5);
        console.log('✅ Google API success, found', results.length, 'results');
        this.cache.set(cacheKey, results);
        return results;
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.log('⚠️ Google API: No results found for:', query);
        this.cache.set(cacheKey, []);
        return [];
      } else {
        console.error('❌ Google API error:', response.data.status, response.data.error_message);
        throw new Error(`Google Places API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Google Maps API request failed:', error.message);
      
      if (error.code === 'ENOTFOUND') {
        throw new Error('Network error: Cannot connect to Google Maps API');
      } else if (error.response) {
        // Google API returned an error
        const errorMsg = error.response.data.error_message || 'Unknown error';
        console.error('❌ Google API Error Details:', error.response.data);
        throw new Error(`Google API error: ${error.response.status} - ${errorMsg}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('No response from Google Maps API - check network connection');
      } else {
        throw new Error(`Failed to fetch places data: ${error.message}`);
      }
    }
  }

  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      throw new Error('No API key available for Google Maps API');
    }

    const cacheKey = `details:${placeId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log('🔍 Getting place details for:', placeId);
      
      const response = await axios.get(`${this.baseURL}/place/details/json`, {
        params: {
          key: this.apiKey,
          place_id: placeId,
          fields: 'name,formatted_address,geometry,rating,opening_hours,photos,website,formatted_phone_number,price_level'
        },
        timeout: 10000
      });

      if (response.data.status === 'OK') {
        this.cache.set(cacheKey, response.data.result);
        return response.data.result;
      } else {
        console.error('❌ Place details error:', response.data.status);
        throw new Error(`Google Places Details error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('❌ Place details API error:', error.message);
      throw new Error('Failed to fetch place details');
    }
  }

  generateStaticMapUrl(lat, lng, markers = [], zoom = 14) {
    try {
      if (!this.apiKey) {
        console.error('❌ No API key available for static map generation');
        return null;
      }

      const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
      const size = '600x300';
      
      let url = `${baseUrl}?center=${lat},${lng}&zoom=${zoom}&size=${size}&key=${this.apiKey}`;
      
      markers.forEach((marker, index) => {
        const color = index === 0 ? 'red' : 'blue';
        const label = index === 0 ? 'S' : (index + 1).toString();
        url += `&markers=color:${color}%7Clabel:${label}%7C${marker.lat},${marker.lng}`;
      });

      console.log('🗺️ Generated static map URL');
      return url;
    } catch (error) {
      console.error('❌ Error generating static map URL:', error);
      return null;
    }
  }

  generateDirectionsUrl(origin, destination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }

  formatLLMResponse(places, query, staticMapUrl = null) {
    let response = `I found these places for "${query}":\n\n`;
    
    if (places.length === 0) {
      response = `No places found for "${query}". Try a different search term or location.`;
      return response;
    }
    
    places.forEach((place, index) => {
      response += `**${index + 1}. ${place.name}**\n`;
      response += `📍 ${place.formatted_address || 'Address not available'}\n`;
      response += `⭐ Rating: ${place.rating || 'No rating'}\n`;
      
      if (place.opening_hours) {
        const status = place.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed Now';
        response += `⏰ ${status}\n`;
      }
      
      const mapsLink = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
      const directionsLink = this.generateDirectionsUrl('Current Location', place.formatted_address);
      
      response += `🗺️ [View on Maps](${mapsLink})\n`;
      response += `🚗 [Get Directions](${directionsLink})\n\n`;
    });

    if (staticMapUrl) {
      response += `\n![Location Map](${staticMapUrl})`;
    }

    return response;
  }

  // Test API key validity
  async testApiKey() {
    try {
      console.log('🧪 Testing Google Maps API key...');
      
      if (!this.apiKey) {
        console.error('❌ No API key available for testing');
        return false;
      }

      const response = await axios.get(`${this.baseURL}/place/textsearch/json`, {
        params: {
          key: this.apiKey,
          query: 'New York',
          radius: 1000
        },
        timeout: 10000
      });
      
      console.log('✅ API Key test response:', response.data.status);
      return response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS';
    } catch (error) {
      console.error('❌ API Key test failed:', error.message);
      if (error.response) {
        console.error('❌ API Error Details:', error.response.data);
      }
      return false;
    }
  }
}

export default GoogleMapsService;
