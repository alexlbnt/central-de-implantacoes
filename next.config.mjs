// Sanitize NEXTAUTH_URL to prevent NextAuth prerender crash (TypeError: Invalid URL)
if (process.env.NEXTAUTH_URL) {
  const raw = process.env.NEXTAUTH_URL.trim().replace(/^["']|["']$/g, '');
  const match = raw.match(/https?:\/\/[^\s*)]+/);
  if (match) {
    process.env.NEXTAUTH_URL = match[0];
  } else if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    process.env.NEXTAUTH_URL = `https://${raw.split(/\s+/)[0]}`;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;

