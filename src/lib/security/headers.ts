/**
 * Security Headers Configuration
 *
 * Provides Content Security Policy and other security headers
 * to protect against XSS, clickjacking, and MIME sniffing attacks.
 */

export interface SecurityHeadersConfig {
  csp: string;
  xFrameOptions: string;
  xContentTypeOptions: string;
  referrerPolicy: string;
  permissionsPolicy: string;
  hsts?: string; // Only set if HTTPS is enabled
}

export function getSecurityHeaders(isProduction: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {
    // Content Security Policy (strict mode with Remotion exceptions)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Remotion needs eval, Next.js needs inline
      "style-src 'self' 'unsafe-inline'", // TailwindCSS inline styles
      "img-src 'self' data: blob: https://aisandbox-pa.googleapis.com", // Whisk images
      "media-src 'self' blob:", // Video playback
      "connect-src 'self' ws: wss:", // WebSocket for HMR
      "frame-ancestors 'none'", // Clickjacking protection
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),

    // XSS protection
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Feature policy - disable unnecessary browser features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  // Only add HSTS in production with HTTPS
  if (isProduction && process.env.HTTPS_ENABLED === 'true') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Apply security headers to a Response object
 */
export function applySecurityHeaders(response: Response, isProduction: boolean = false): Response {
  const headers = getSecurityHeaders(isProduction);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}
