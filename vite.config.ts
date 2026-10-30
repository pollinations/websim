import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: "/",
    server: { host: "localhost", port: 16386, strictPort: true },
    preview: { host: "localhost", port: 16386, strictPort: true },
    resolve: {
        dedupe: ["react", "react-dom"],
    },
});
