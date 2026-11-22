import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:3011",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      args: [
        "--host-resolver-rules=MAP guest.tablelane.test 127.0.0.1",
        "--no-proxy-server",
      ],
    },
  },
  webServer: ["private", "public"].map((mode, i) => ({
    command: "npm run dev -- -p " + (3011 + i),
    port: 3011 + i,
    reuseExistingServer: false,
    env: {
      WORKSPACE_MODE: mode,
      NEXT_DIST_DIR: i ? ".next-guest" : ".next",
      PRIVATE_API_ORIGIN: "http://127.0.0.1:8021",
      PUBLIC_API_ORIGIN: "http://127.0.0.1:8022",
    },
  })),
});
