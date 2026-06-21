import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "homepage-layout.spec.mjs",
  use: {
    baseURL: "http://127.0.0.1:4321",
    colorScheme: "light",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
  },
});
