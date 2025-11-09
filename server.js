// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables FIRST - with path specification
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Environment Check:');    
console.log('   Current directory:', __dirname);
console.log('   GOOGLE_MAPS_API_KEY:', process.env.GOOGLE_MAPS_API_KEY ? '✅ Loaded' : '❌ NOT LOADED');
console.log('   Key length:', process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.length : 0);
console.log('   Key prefix:', process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'N/A');
console.log('   PORT:', process.env.PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV);

// CRITICAL: Exit if no API key
if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.error('❌ CRITICAL ERROR: GOOGLE_MAPS_API_KEY is not set in environment variables!');
  console.error('   Please check your .env file exists and contains GOOGLE_MAPS_API_KEY');
  console.error('   Current .env path:', path.join(__dirname, '.env'));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 1. COMPLETELY OPEN CORS - ALLOW EVERYTHING
app.use((req, res, next) => {
  console.log('🌐 CORS - Allowing origin:', req.headers.origin || 'Unknown');
  
  // ALLOW EVERYTHING
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight');
    return res.status(200).end();
  }

  next();
});

// 2. Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 3. Serve static files with proper headers
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  }
}));

// 4. Import routes and services
import GoogleMapsService from './config/google-maps.js';

// Test Google Maps API key on startup
async function testGoogleMapsApi() {
  try {
    console.log('🧪 Testing Google Maps API key on startup...');
    const mapsService = new GoogleMapsService(process.env.GOOGLE_MAPS_API_KEY);
    const isValid = await mapsService.testApiKey();
    
    if (isValid) {
      console.log('✅ Google Maps API key is valid and working!');
    } else {
      console.error('❌ Google Maps API key is invalid or not working!');
      console.error('   Please check:');
      console.error('   1. API key is correct:', process.env.GOOGLE_MAPS_API_KEY);
      console.error('   2. Required APIs are enabled (Places API, Maps Static API)');
      console.error('   3. Billing is set up in Google Cloud Console');
    }
  } catch (error) {
    console.error('❌ Failed to test Google Maps API key:', error.message);
  }
}

// Import routes after CORS is set up
import { securityHeaders, apiLimiter, validateApiKey } from './middleware/security.js';
import { mapsRouter } from './routes/maps.js';

// Security middleware (relaxed)
app.use(securityHeaders);
app.use(apiLimiter);

// 5. Routes
app.use('/api/maps', validateApiKey, mapsRouter);

// 6. Environment debug endpoint
app.get('/api/debug-env', (req, res) => {
  res.json({
    google_maps_api_key: {
      loaded: !!process.env.GOOGLE_MAPS_API_KEY,
      length: process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.length : 0,
      prefix: process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'N/A'
    },
    port: process.env.PORT,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 7. CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS IS WORKING! ✅',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    server: `http://192.168.56.10:${PORT}`,
    cors: 'COMPLETELY OPEN',
    referrer_policy: 'no-referrer-when-downgrade',
    api_key_loaded: !!process.env.GOOGLE_MAPS_API_KEY
  });
});

// 8. Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'LLM Maps API',
    port: PORT,
    cors: 'COMPLETELY OPEN - ALL ORIGINS ALLOWED',
    referrer_policy: 'no-referrer-when-downgrade',
    api_key_loaded: !!process.env.GOOGLE_MAPS_API_KEY,
    access_urls: [
      `http://localhost:${PORT}`,
      `http://192.168.56.10:${PORT}`,
      `http://127.0.0.1:${PORT}`
    ]
  });
});

// 9. Serve frontend with proper headers
app.get('/', (req, res) => {
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.header('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/maps-component', (req, res) => {
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.header('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(__dirname, 'public', 'maps-component.html'));
});

// 10. Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 11. 404 handler
app.use('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 LLM Maps API Server running!');
  console.log('📍 Port:', PORT);
  console.log('🌐 CORS: COMPLETELY OPEN - ALL ORIGINS ALLOWED');
  console.log('🔗 Referrer Policy: no-referrer-when-downgrade');
  console.log('🔑 Google Maps API Key:', process.env.GOOGLE_MAPS_API_KEY ? '✅ Loaded' : '❌ NOT LOADED');
  console.log('📡 Network URLs:');
  console.log('   http://localhost:' + PORT);
  console.log('   http://192.168.56.10:' + PORT);
  console.log('   http://127.0.0.1:' + PORT);
  console.log('🔧 Test CORS: http://192.168.56.10:' + PORT + '/api/cors-test');
  console.log('🐛 Debug Env: http://192.168.56.10:' + PORT + '/api/debug-env');
  console.log('❤️ Health: http://192.168.56.10:' + PORT + '/health');
  
  // Test Google Maps API after server starts
  setTimeout(() => {
    testGoogleMapsApi();
  }, 1000);
});

export default app;
