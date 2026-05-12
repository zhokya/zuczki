import { defineConfig, loadEnv } from "vite";

export default ({ mode }) => {
    const envDir = "../";

    const env = loadEnv(mode, envDir, "");

    return defineConfig({
        envDir: envDir,
        server: {
            allowedHosts: true,
            port: Number(env.VITE_PORT)
        },
        preview: {
            port: Number(env.VITE_PORT)
        }
    });
};
