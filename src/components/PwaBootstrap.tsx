import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.warn("Service Worker not supported");
      return;
    }

    const registerServiceWorker = async () => {
      try {
        console.log("Attempting to register PWA service worker...");
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.info("PWA service worker registered:", reg);
        window.dispatchEvent(new Event("pwa-registered"));
      } catch (error) {
        console.error("PWA service worker registration failed:", error);
      }
    };

    const timeoutId = setTimeout(registerServiceWorker, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
