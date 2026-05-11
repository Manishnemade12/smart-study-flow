declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl?: string, registration?: ServiceWorkerRegistration) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(options?: RegisterSWOptions): () => Promise<void> | void;
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
  }
}

export {};
