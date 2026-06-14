/** @type {import('next').NextConfig} */

const SUPABASE_HOST = 'pdysynrwsutteesyiqcy.supabase.co'

// Content-Security-Policy
// Next.js requires 'unsafe-inline' + 'unsafe-eval' for its JS runtime.
// All external origins are explicitly whitelisted.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://gmail.googleapis.com https://oauth2.googleapis.com https://www.googleapis.com`,
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser feature access
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Force HTTPS for 2 years (enable only in production; dev may need HTTP)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent XSS and injection
  { key: 'Content-Security-Policy', value: CSP },
  // Disable DNS prefetch for privacy
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

const nextConfig = {
  transpilePackages: ['@tracker/core', '@tracker/db'],

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

module.exports = nextConfig
