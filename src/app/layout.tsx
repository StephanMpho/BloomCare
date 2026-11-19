import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/install-app";

export const metadata: Metadata = {
  title: "BloomCare — Pregnancy Nutrition & Wellness",
  description: "Nourishing you, caring for your little one.",
  robots: { index: false, follow: false },
  applicationName: "BloomCare",
  // iPhone: "Add to Home Screen" opens full screen with this name and icon.
  appleWebApp: { capable: true, title: "BloomCare", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff9f5" }, { media: "(prefers-color-scheme: dark)", color: "#1b2027" }],
};

const themeInit = `try{var t=localStorage.getItem('bloom-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className="font-sans antialiased">{children}<RegisterServiceWorker /></body>
    </html>
  );
}
