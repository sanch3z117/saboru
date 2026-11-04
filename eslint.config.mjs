import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "coverage/**",
      "public/sw.js",
      "public/sw.js.map",
      "public/swe-worker-*.js",
      "public/maplibre/**",
      "test-results/**",
      "playwright-report/**",
      "scripts/**",
    ],
  },
];

export default eslintConfig;
