import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");

  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins: PluginOption[] = [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: {
        enabled: true,
      },
      includeAssets: ["icon.svg", "maskable-icon.svg"],
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2}"],
        navigateFallback: "/",
      },
    }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    react(),
  ];

  if (command === "build") {
    plugins.push(cloudflare({ viteEnvironment: { name: "ssr" } }));
  }

  return {
    define: envDefine,
    plugins,
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
      ],
    },
  };
});
