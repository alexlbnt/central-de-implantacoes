// Sanitize NEXTAUTH_URL to prevent NextAuth prerender crash (TypeError: Invalid URL)
let cleanNextAuthUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
if (cleanNextAuthUrl) {
  const raw = cleanNextAuthUrl.trim().replace(/^["']|["']$/g, "");
  const match = raw.match(/https?:\/\/[^\s*)]+/);
  if (match) {
    cleanNextAuthUrl = match[0];
  } else if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    cleanNextAuthUrl = `https://${raw.split(/\s+/)[0]}`;
  }
}
if (!cleanNextAuthUrl || cleanNextAuthUrl === "https://") {
  cleanNextAuthUrl = "http://localhost:3000";
}
process.env.NEXTAUTH_URL = cleanNextAuthUrl;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: cleanNextAuthUrl,
    NEXTAUTH_URL_INTERNAL: cleanNextAuthUrl,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;


