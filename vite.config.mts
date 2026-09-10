import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

loadEnv();

// Mount api/proxy.ts handler directly inside Vite dev server — single port, no child process
function inlineApiPlugin(): Plugin {
  return {
    name: 'inline-api',
    apply: 'serve',
    async configureServer(server) {
      // Dynamically import handler (tsx registers itself via Vite's ts pipeline in dev)
      const { default: handler } = await import('./api/proxy');

      server.middlewares.use('/api/proxy', (req: any, res: any) => {
        // Inject Vercel-style helpers
        res.status = (code: number) => { res.statusCode = code; return res; };
        res.json = (data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };
        res.send = (data: any) => { res.end(data); return res; };
        res.redirect = (statusOrUrl: number | string, url?: string) => {
          const code = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
          const loc = typeof statusOrUrl === 'string' ? statusOrUrl : url!;
          res.writeHead(code, { Location: loc });
          res.end();
          return res;
        };

        const qs = new URL(req.url!, `http://localhost`).searchParams;
        req.query = Object.fromEntries(qs.entries());

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c: any) => { body += c; });
          req.on('end', () => {
            try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
            handler(req, res).catch((e: any) => {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: e.message }));
            });
          });
        } else {
          handler(req, res).catch((e: any) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, message: e.message }));
          });
        }
      });

      // Mount api/fcm-send.ts handler in dev server
      server.middlewares.use('/api/fcm-send', async (req: any, res: any) => {
        const { default: fcmHandler } = await import('./api/fcm-send');
        res.status = (code: number) => { res.statusCode = code; return res; };
        res.json = (data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c: any) => { body += c; });
          req.on('end', () => {
            try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
            fcmHandler(req, res).catch((e: any) => {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            });
          });
        } else {
          fcmHandler(req, res).catch((e: any) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineApiPlugin()],
  define: {
    'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY || ''),
    'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || ''),
    'process.env.FIREBASE_DATABASE_URL': JSON.stringify(process.env.FIREBASE_DATABASE_URL || ''),
    'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID || ''),
    'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET || ''),
    'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID || ''),
    'process.env.FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID || ''),
    'process.env.FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.FIREBASE_MEASUREMENT_ID || ''),
    'process.env.CLOUDINARY_CLOUD_NAME': JSON.stringify(process.env.CLOUDINARY_CLOUD_NAME || ''),
    'process.env.CLOUDINARY_UPLOAD_PRESET': JSON.stringify(process.env.CLOUDINARY_UPLOAD_PRESET || 'sapapedestrian'),
    'process.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(process.env.VITE_VAPID_PUBLIC_KEY || 'BOS-76i4DY8yREaNKWdh3xkqKkPTVLibbvSroA2rAkOxJlfY7HhF2YDzuIryY4D_5Ky-nQhehNBLBcL7IBt-TNQ'),
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
