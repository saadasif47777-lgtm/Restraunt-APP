import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3011",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: "npm run dev -- -p 3011",
    url: "http://127.0.0.1:3011",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:8011",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "browser-test-public-key",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:8011/api",
    },
    reuseExistingServer: false,
  },
});
