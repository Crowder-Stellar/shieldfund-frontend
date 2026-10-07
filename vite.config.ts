import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { NETWORK_CONFIG } from './src/lib/contracts';

const origin = (url: string) => new URL(url).origin;

/**
 * Builds the Content-Security-Policy from the origins the app actually talks
 * to: the configured backend, Soroban RPC / Horizon for every network, and
 * Google Fonts. Third-party origins are listed here deliberately — adding a
 * new one should be a reviewed change.
 */
function contentSecurityPolicy(apiBaseUrl: string): string {
  const connect = new Set<string>(["'self'", origin(apiBaseUrl)]);
  for (const net of Object.values(NETWORK_CONFIG)) {
    connect.add(origin(net.sorobanRpcUrl));
    connect.add(origin(net.horizonUrl));
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    // React/motion set inline style attributes; Google Fonts serves the CSS.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Campaign cover images are arbitrary https URLs entered by admins.
    "img-src 'self' data: blob: https:",
    `connect-src ${[...connect].join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Only when the backend is https — otherwise a local http backend breaks.
    ...(apiBaseUrl.startsWith('https://') ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

// Injected at build time only — Vite's dev server relies on inline scripts for HMR.
function cspPlugin(apiBaseUrl: string): Plugin {
  return {
    name: 'shieldfund-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(apiBaseUrl) },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss(), cspPlugin(apiBaseUrl)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
