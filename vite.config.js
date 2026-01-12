import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [["babel-plugin-react-compiler"]] },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://app.floorida.site",
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // ✅ 백엔드가 Origin/Referer 체크하면 여기서 막히는 경우 많음
            proxyReq.setHeader("origin", "https://app.floorida.site");
            proxyReq.setHeader("referer", "https://app.floorida.site/");
          });
        },
      },
      "/teams": {
        target: "https://app.floorida.site",
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("origin", "https://app.floorida.site");
            proxyReq.setHeader("referer", "https://app.floorida.site/");
          });
        },
      },
    },
  },
});
