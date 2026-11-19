"use client";
import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, CheckCircle2, MoreVertical } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registers the service worker once per page load (no caching; see public/sw.js). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/**
 * "Install BloomCare" card: a one-tap button on Android/desktop Chrome and Edge,
 * step-by-step instructions on iPhone (Safari has no install button for websites).
 */
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other");
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) {
    return <p className="flex items-center gap-2 rounded-3xl bg-sage/40 p-4 font-semibold"><CheckCircle2 size={20} /> BloomCare is installed on this device.</p>;
  }

  return (
    <div className="rounded-3xl bg-blush/60 p-4 dark:bg-night-card">
      <p className="text-lg font-semibold">Install BloomCare on your phone</p>
      <p className="text-sm">Get an app icon on your home screen. It opens full screen, with no link to find.</p>
      {prompt ? (
        <button onClick={async () => { await prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome === "accepted") setInstalled(true); setPrompt(null); }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-rose px-4 font-semibold text-white">
          <Download size={18} /> Install app
        </button>
      ) : platform === "ios" ? (
        <ol className="mt-3 space-y-1.5 text-[15px]">
          <li>1. Open this page in <strong>Safari</strong>.</li>
          <li className="flex items-center gap-1">2. Tap <Share size={16} aria-label="Share" /> <strong>Share</strong> (bottom of the screen).</li>
          <li className="flex items-center gap-1">3. Tap <PlusSquare size={16} aria-hidden /> <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
        </ol>
      ) : (
        <ol className="mt-3 space-y-1.5 text-[15px]">
          <li className="flex items-center gap-1">1. In Chrome, tap the <MoreVertical size={16} aria-label="menu" /> menu (top right).</li>
          <li>2. Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</li>
        </ol>
      )}
    </div>
  );
}
