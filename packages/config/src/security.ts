// Security configuration: CORS, Rate Limiting, Headers, Input Validation
// Never expose secrets in code. All secrets from .env only.

export const SECURITY_CONFIG = {
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },
  // Input validation: never trust frontend price/stock/role/payment/status
  validation: {
    maxBodySize: 1024 * 1024, // 1MB
    allowUnknownFields: false,
  },
}
