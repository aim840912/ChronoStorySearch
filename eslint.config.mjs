import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.backup*",
      "**/drops-new*.json",
    ],
  },
  {
    // 全域規則：忽略以 _ 開頭的未使用變數和參數
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // 針對使用 R2 CDN 圖片的元件，允許使用 <img> 標籤
    // 原因：圖片來自 Cloudflare R2 CDN（已優化），使用 Next.js <Image /> 會：
    // 1. 消耗 Vercel Image Optimization 配額（Hobby: 1,000/月）
    // 2. 產生不必要的轉換成本（圖片已在 CDN 優化）
    // 3. 增加 Serverless Function 呼叫次數
    // 參考：CLAUDE.md - 技術債掃描報告 - 圖片優化策略
    files: ["src/components/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
