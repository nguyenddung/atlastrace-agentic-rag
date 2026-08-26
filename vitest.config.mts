import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Next.js resolves the "@/*" alias from tsconfig; Vitest needs it declared here
// so unit tests can import modules the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
