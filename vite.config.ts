import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Load firebase credentials if present to expose them safely to client code-replacement
  const firebaseDefs: Record<string, string> = {};
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      firebaseDefs['import.meta.env.VITE_FIREBASE_API_KEY'] = JSON.stringify(config.apiKey || '');
      firebaseDefs['import.meta.env.VITE_FIREBASE_AUTH_DOMAIN'] = JSON.stringify(config.authDomain || '');
      firebaseDefs['import.meta.env.VITE_FIREBASE_PROJECT_ID'] = JSON.stringify(config.projectId || '');
      firebaseDefs['import.meta.env.VITE_FIREBASE_APP_ID'] = JSON.stringify(config.appId || '');
      firebaseDefs['import.meta.env.VITE_FIREBASE_STORAGE_BUCKET'] = JSON.stringify(config.storageBucket || '');
      firebaseDefs['import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID'] = JSON.stringify(config.messagingSenderId || '');
    }
  } catch (err) {
    console.warn("Could not read firebase-applet-config.json at build time:", err);
  }

  return {
    plugins: [react(), tailwindcss()],
    define: firebaseDefs,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
