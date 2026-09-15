import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // Never expose service-role or other server secrets to the client bundle.
  // Only NEXT_PUBLIC_* vars are allowed to reach the browser; this is enforced
  // by Next.js itself, but we keep server-only clients in lib/supabase/admin.ts
  // (imported ONLY from route handlers / server components) as a second guard.
};

export default withPWA(nextConfig);
