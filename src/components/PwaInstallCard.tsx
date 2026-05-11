import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Smartphone, WifiOff, ExternalLink } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(navigator.onLine);
    setIos(isIos());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleOpenChromeMenu = () => {
    alert(
      "To install on Chrome/Edge:" +
        "\n\n1. Click the menu icon (⋮) in the top-right corner" +
        "\n2. Look for 'Install app' or 'Install Smart Notes'" +
        "\n3. Click to add to your device"
    );
  };

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">Install as a PWA</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Install this web app for offline use and save it to your home screen.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatusPill
            icon={<WifiOff className="h-4 w-4" />}
            label={online ? "Online" : "Offline"}
            value={online ? "Ready to sync" : "Offline mode enabled"}
          />
          <StatusPill
            icon={<Smartphone className="h-4 w-4" />}
            label="Mobile"
            value={ios ? "Add to Home Screen on iPhone/iPad" : "Install from browser menu"}
          />
          <StatusPill
            icon={<RefreshCw className="h-4 w-4" />}
            label="Install state"
            value={installed ? "Installed" : "Available now"}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-2 sm:items-center">
            {deferredPrompt && !installed ? (
              <Button onClick={handleInstall} className="gap-2">
                <Download className="h-4 w-4" /> Install app
              </Button>
            ) : (
              <Button variant="secondary" className="gap-2" onClick={handleOpenChromeMenu}>
                <ExternalLink className="h-4 w-4" />
                {ios ? "Add to Home Screen guide" : "Show install steps"}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {ios
              ? "On iPhone/iPad: Open Safari → Tap Share → Add to Home Screen"
              : "On Chrome/Edge: Click menu (⋮) → Install Smart Notes or check below"}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
