import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import proxyHandler from './proxy';

const PORT = 3001;

// Load .env variables manually to avoid dependency issues
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx > -1) {
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
    console.log('[ENV] Loaded .env configuration successfully.');
  } else {
    console.warn('[ENV] No .env file found in root directory.');
  }
}

loadEnv();

const server = http.createServer(async (req: any, res: any) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Inject Vercel-like response helper functions
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };

  res.json = (data: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  res.send = (data: any) => {
    res.end(data);
    return res;
  };

  res.redirect = (statusOrUrl: number | string, targetUrl?: string) => {
    const code = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    const redirectUrl = typeof statusOrUrl === 'string' ? statusOrUrl : targetUrl;
    res.writeHead(code, { Location: redirectUrl });
    res.end();
    return res;
  };

  // Parse query parameters
  const parsedUrl = url.parse(req.url || '', true);
  req.query = parsedUrl.query;

  // Route routing
  const pathname = parsedUrl.pathname || '';

  async function executeHandler(handler: any) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch (e) {
          req.body = {};
        }
        try {
          await handler(req, res);
        } catch (err: any) {
          console.error('[ServerError]:', err);
          res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
        }
      });
    } else {
      try {
        await handler(req, res);
      } catch (err: any) {
        console.error('[ServerError]:', err);
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
      }
    }
  }

  if (pathname === '/api/proxy' || pathname === '/api/proxy/') {
    await executeHandler(proxyHandler);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(` LOCAL BACKEND SERVER RUNNING AT: http://localhost:${PORT}`);
  console.log(`========================================================`);
});
