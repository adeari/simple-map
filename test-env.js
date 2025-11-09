// test-env.js
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Environment Test:');
console.log('GOOGLE_MAPS_API_KEY:', process.env.GOOGLE_MAPS_API_KEY ? '✅ LOADED' : '❌ NOT LOADED');
console.log('Key value:', process.env.GOOGLE_MAPS_API_KEY);
console.log('Key length:', process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.length : 0);
