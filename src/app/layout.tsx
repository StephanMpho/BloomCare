import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BloomCare — Pregnancy Nutrition & Wellness",
  description: "Nourishing you, caring for your little one.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#F8DDE3", width: "device-width", initialScale: 1 };

const themeInit = `try{var t=localStorage.getItem('bloom-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
