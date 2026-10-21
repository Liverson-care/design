import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // L'interface est rédigée en français : les apostrophes dans le JSX sont attendues.
    rules: { "react/no-unescaped-entities": "off" },
  },
];
