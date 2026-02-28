import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scraper/__tests__/**/*.test.ts"],
  },
});
