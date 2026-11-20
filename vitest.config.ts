import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    // Node 25+ ships its own localStorage on globalThis, which shadows jsdom's.
    execArgv: ["--no-experimental-webstorage"],
  },
});
