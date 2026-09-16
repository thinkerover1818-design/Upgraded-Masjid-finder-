import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://masjidfinder.example.com";
  return ["", "/search", "/plans", "/shop", "/about", "/how-it-works", "/contact", "/faq", "/privacy", "/terms"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}