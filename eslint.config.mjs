import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    // Ignores must be in their own object or part of the config object
    ignores: ["**/node_modules/**", "**/.next/**", "**/out/**", "**/public/**", "**/*.js"],
    
    // Custom Rules
    rules: {
       "@typescript-eslint/no-explicit-any": "off",
       "@typescript-eslint/no-unused-vars": "off",
       "react/no-unescaped-entities": "off"
    }
  }
];

export default eslintConfig;