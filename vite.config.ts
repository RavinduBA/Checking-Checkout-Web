import react from "@vitejs/plugin-react-swc";
import path from "path";
import vercel from "vite-plugin-vercel";

export default {
  plugins: [react(), vercel()],
  server: {
    host: "::",
    port: 8080,
  },
  	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
};
