// middleware/security.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Very permissive rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very high limit for testing
  message: {
    error: 'Too many requests'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security headers middleware - FIXED Referrer Policy
const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' }
});

// Optional API key validation
const validateApiKey = (req, res, next) => {
  // Skip auth for OPTIONS, health checks, and CORS tests
  if (req.method === 'OPTIONS' || 
      req.path === '/health' || 
      req.path === '/api/cors-test' ||
      req.path === '/') {
    return next();
  }

  // In development, API key is optional
  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 API Key (optional in development):', req.headers['x-api-key'] ? 'Provided' : 'Not provided');
    return next();
  }

  // In production, require API key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.FRONTEND_API_KEY) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Include x-api-key header'
    });
  }
  
  next();
};

// Export everything as named exports - SINGLE EXPORT STATEMENT
export { apiLimiter, securityHeaders, validateApiKey };
