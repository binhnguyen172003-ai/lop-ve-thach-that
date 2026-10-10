import { defineConfig, devices } from "playwright/test";

// Máy đã có sẵn Chromium (ví dụ môi trường cloud): đặt PW_CHROMIUM_PATH để khỏi tải trình duyệt.
// Không có WebKit thì đặt PW_SKIP_WEBKIT=1 để bỏ cấu hình iPhone.
const chromium = process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {};

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.mjs",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    serviceWorkers: "block",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], browserName: "chromium", ...chromium } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], browserName: "chromium", ...chromium } },
    ...(process.env.PW_SKIP_WEBKIT ? [] : [{ name: "mobile-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } }])
  ],
  webServer: {
    command: "node tests/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  outputDir: "test-results"
});
