import { vercelPreset } from '@vercel/react-router/vite';

export default {
  appDirectory: "src",
  ssr: false,
  prerender: ["/", "/login", "/register", "/forgot-password", "/reset-password", "/401", "/404"],
  presets: [vercelPreset()],
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  }
};
