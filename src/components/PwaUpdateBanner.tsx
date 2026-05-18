import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, WifiOff, Download } from "lucide-react";

export function PwaUpdateBanner() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Listen for SW update available (fired by workbox-window via vite-plugin-pwa)
    const handleSWUpdate = () => setNeedsUpdate(true);
    window.addEventListener("sw-update-available", handleSWUpdate);

    // Online / offline detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // PWA install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("sw-update-available", handleSWUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {/* Offline indicator */}
        {isOffline && (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 bg-amber-500/90 backdrop-blur-md text-black font-bold px-5 py-3 rounded-xl shadow-xl text-sm"
          >
            <WifiOff className="w-5 h-5 shrink-0" />
            <span>You are offline — all data is saved locally</span>
          </motion.div>
        )}

        {/* Update available */}
        {needsUpdate && (
          <motion.div
            key="update"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 bg-[#0a0a1a] border border-primary/50 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
          >
            <RefreshCw className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">New version available</span>
            <button
              onClick={handleUpdate}
              className="ml-2 px-3 py-1 bg-primary text-primary-foreground rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors"
            >
              Update
            </button>
            <button
              onClick={() => setNeedsUpdate(false)}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
            >
              Later
            </button>
          </motion.div>
        )}

        {/* Install prompt */}
        {isInstallable && !needsUpdate && (
          <motion.div
            key="install"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 bg-[#0a0a1a] border border-success/50 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
          >
            <Download className="w-4 h-4 text-success shrink-0" />
            <span className="text-muted-foreground">Install app for offline use</span>
            <button
              onClick={handleInstall}
              className="ml-2 px-3 py-1 bg-success text-success-foreground rounded-lg font-bold text-xs hover:bg-success/90 transition-colors"
            >
              Install
            </button>
            <button
              onClick={() => setIsInstallable(false)}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
