// routes/maps.js
import express from 'express';
import GoogleMapsService from '../config/google-maps.js';

// Debug: Check if API key is available when importing
console.log('🗺️ Maps Routes - API Key Available:', !!process.env.GOOGLE_MAPS_API_KEY);

const router = express.Router();

// FIXED: Pass the API key from environment variables to the service
const mapsService = new GoogleMapsService(process.env.GOOGLE_MAPS_API_KEY);

// Add CORS headers to all routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Handle OPTIONS for all routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.status(200).end();
});

// Test API key endpoint
router.get('/test-api-key', async (req, res) => {
  try {
    console.log('🧪 Testing Google Maps API key...');
    const isValid = await mapsService.testApiKey();
    
    if (isValid) {
      res.json({
        success: true,
        message: 'Google Maps API key is valid and working',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Google Maps API key is invalid or not working',
        message: 'Please check your API key configuration in .env file'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test API key',
      message: error.message
    });
  }
});

// Search places endpoint
router.post('/search', async (req, res) => {
  try {
    console.log('🔍 Search request received:', req.body);
    
    const { query, location, radius = 5000, type } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    console.log('🔍 Searching for:', query, 'Location:', location);

    const places = await mapsService.searchPlaces(query, location, radius, type);
    
    let staticMapUrl = null;

    if (places.length > 0 && places[0].geometry) {
      const markers = places.map(place => ({
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      }));
      
      staticMapUrl = mapsService.generateStaticMapUrl(
        places[0].geometry.location.lat,
        places[0].geometry.location.lng,
        markers
      );
    }

    const llmResponse = mapsService.formatLLMResponse(places, query, staticMapUrl);

    console.log('✅ Search successful, found', places.length, 'places');

    res.json({
      success: true,
      query: query,
      places: places,
      llm_response: llmResponse,
      static_map_url: staticMapUrl,
      total_results: places.length
    });

  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
      details: 'Check Google Maps API key and network connection'
    });
  }
});

// Get place details endpoint
router.get('/place/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    console.log('🔍 Getting details for place:', placeId);
    
    const placeDetails = await mapsService.getPlaceDetails(placeId);

    res.json({
      success: true,
      place: placeDetails,
      maps_url: `https://www.google.com/maps/place/?q=place_id:${placeId}`
    });

  } catch (error) {
    console.error('❌ Place details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get place details',
      message: error.message
    });
  }
});

// Get coordinates for location
router.get('/geocode', async (req, res) => {
  try {
    const { location } = req.query;
    console.log('🗺️ Geocoding request for:', location);
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location parameter is required'
      });
    }

    const commonLocations = {
      'new york': '40.7128,-74.0060',
      'los angeles': '34.0522,-118.2437',
      'chicago': '41.8781,-87.6298',
      'miami': '25.7617,-80.1918',
      'london': '51.5074,-0.1278',
      'tokyo': '35.6762,139.6503',
      'paris': '48.8566,2.3522',
      'sydney': '-33.8688,151.2093',
      'bangkok': '13.7563,100.5018',
      'dubai': '25.2048,55.2708',
      'rome': '41.9028,12.4964',
      'san francisco': '37.7749,-122.4194',
      'seattle': '47.6062,-122.3321',
      'toronto': '43.6532,-79.3832',
      'berlin': '52.5200,13.4050',
      'amsterdam': '52.3676,4.9041',
      'singapore': '1.3521,103.8198',
      'hong kong': '22.3193,114.1694',
      'shanghai': '31.2304,121.4737'
    };

    const cityName = location.toLowerCase();
    const coordinates = commonLocations[cityName];

    if (!coordinates) {
      return res.status(404).json({
        success: false,
        error: 'Location not found in database',
        message: `Coordinates for "${location}" are not available. Try one of the supported cities.`
      });
    }

    res.json({
      success: true,
      location: location,
      coordinates: coordinates
    });

  } catch (error) {
    console.error('❌ Geocode error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get coordinates',
      message: error.message
    });
  }
});

// List supported cities
router.get('/supported-cities', (req, res) => {
  const supportedCities = [
    'New York', 'Los Angeles', 'Chicago', 'Miami', 
    'London', 'Tokyo', 'Paris', 'Sydney',
    'Bangkok', 'Dubai', 'Rome', 'San Francisco',
    'Seattle', 'Toronto', 'Berlin', 'Amsterdam',
    'Singapore', 'Hong Kong', 'Shanghai'
  ];
  
  res.json({
    success: true,
    supported_cities: supportedCities,
    count: supportedCities.length
  });
});

// Export the router
export { router as mapsRouter };
export default router;
