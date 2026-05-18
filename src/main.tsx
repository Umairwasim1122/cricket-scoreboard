import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker produced by vite-plugin-pwa.
// Only runs in production — in dev, the SW is disabled so hot reload works normally.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // vite-plugin-pwa injects the virtual module; dynamic import keeps it out of dev bundles
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          // Notify the PwaUpdateBanner component
          window.dispatchEvent(new Event("sw-update-available"));
        },
        onOfflineReady() {
          console.info("[PWA] App is ready for offline use.");
        },
      });
    })
    .catch(() => {
      // Virtual module not available — safe to ignore in non-PWA builds
    });
}
