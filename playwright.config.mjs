import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.mjs",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], browserName: "chromium" } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } }
  ],
  webServer: {
    command: "node tests/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  outputDir: "test-results"
});
