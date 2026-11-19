import type { MetadataRoute } from "next";

// Makes BloomCare installable ("Add to Home Screen" / "Install app"): it then opens
// full screen from its own icon, without the browser's address bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BloomCare — Pregnancy Nutrition & Wellness",
    short_name: "BloomCare",
    description: "Nourishing you, caring for your little one.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff9f5",
    theme_color: "#b9506b",
    lang: "en-ZA",
    categories: ["health", "lifestyle", "food"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Photo of food", url: "/food/photo", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Log food", url: "/food/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Shopping list", url: "/groceries", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
