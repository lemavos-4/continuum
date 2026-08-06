import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const loadBuildEnv = (): Record<string, string> => {
  const buildEnvPath = path.resolve(__dirname, ".env.build");
  if (!fs.existsSync(buildEnvPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(buildEnvPath, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const [key, ...value] = line.split("=");
        return [key, value.join("=")];
      }),
  );
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const buildEnv = loadBuildEnv();
  const buildVersion = buildEnv.VITE_BUILD_VERSION || process.env.VITE_BUILD_VERSION || "";

  return {
    define: {
      "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(buildVersion),
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    server: {
      host: "::",
      port: Number(process.env.PORT) || Number(process.env.VITE_DEV_PORT) || 5173,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lucide-react": path.resolve(__dirname, "./src/lib/heroicons.ts"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-view",
      "prosemirror-transform",
      "prosemirror-commands",
      "prosemirror-keymap",
      "prosemirror-schema-list",
      "prosemirror-gapcursor",
      "prosemirror-tables",
      "@tiptap/pm",
    ],
  },
  optimizeDeps: {
    include: [
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-view",
      "prosemirror-transform",
    ],
  },
}});