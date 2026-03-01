import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        window: "readonly",
        document: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        localStorage: "readonly",
        console: "readonly",
        confirm: "readonly",
        navigator: "readonly",
        globalThis: "readonly",
        Event: "readonly",
        HTMLScriptElement: "readonly",
        HTMLStyleElement: "readonly",
      },
    },
    rules: {
      "obsidianmd/sample-names": "off",
      "@typescript-eslint/require-await": "error",
    },
  },
]);
