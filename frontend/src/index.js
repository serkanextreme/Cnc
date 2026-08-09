import React from "react";
import ReactDOM from "react-dom/client";

/* Offline çalışabilmesi için fontlar paket içinde (CDN yok) */
import "@fontsource/barlow-condensed/400.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";

import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* PWA: uygulama kabuğunu önbelleğe al -> internet olmadan da açılır */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ""}/sw.js`)
      .catch((err) => console.warn("Service worker kaydedilemedi:", err));
  });
}
