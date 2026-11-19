// BloomCare service worker: makes the app installable. It deliberately caches NOTHING,
// because pages contain private health data; every request goes to the network.
// If the phone is offline, page loads get a small friendly message instead.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_HTML = `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>BloomCare: offline</title>
<style>body{font-family:system-ui,sans-serif;background:#fff9f5;color:#29313a;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}
h1{font-size:1.4rem}button{margin-top:16px;min-height:44px;padding:0 20px;border:0;border-radius:16px;background:#b9506b;color:#fff;font-size:1rem;font-weight:600}
p.e{margin-top:28px;font-size:.9rem;color:#a8435e}</style></head>
<body><div><h1>You're offline</h1><p>BloomCare needs an internet connection. Check your data or Wi-Fi and try again.</p>
<button onclick="location.reload()">Try again</button>
<p class="e">In an emergency call 10177, or 112 from a cellphone.</p></div></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // let the browser handle everything else normally
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
