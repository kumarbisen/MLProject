import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  // Mark these as external so they're not bundled (installed by consumer)
  external: [
    "stripe",
    "ai",
    "@ai-sdk/google",
    "@mastra/core",
    "@mastra/core/tools",
    "@mastra/core/agent",
    "@mastra/core/workflows",
  ],
  esbuildOptions(options) {
    options.platform = "node";
    options.target = "node20";
  },
});
