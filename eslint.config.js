import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/src-tauri/target/**",
      "**/src-tauri/gen/**",
      "package-lock.json",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginVue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      // 搜索高亮等场景在服务端已转义，仍保留告警级别便于审计
      "vue/no-v-html": "warn",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/attributes-order": "off",
    },
  },
  {
    files: ["src/**/*.{ts,vue}", "vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },
  {
    files: ["vite.config.ts", "eslint.config.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: [
      "**/features/notes/components/NoteList.vue",
      "**/features/editor/components/MarkdownEditor.vue",
    ],
    rules: {
      // NoteList：搜索高亮经 escapeHtml；MarkdownEditor：预览经 DOMPurify 消毒
      "vue/no-v-html": "off",
    },
  },
  // 启用 prettier/prettier，并合并 eslint-config-prettier 中与 Prettier 冲突的规则关闭项，须放在最后
  eslintPluginPrettierRecommended,
);
