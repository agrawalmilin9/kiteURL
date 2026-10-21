import express, { Request, Response } from 'express';
import path from 'path';
import 'dotenv/config';
import { createApp } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = createApp({ seed: true });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KiteURL server running at http://localhost:${PORT}`);
    if (!process.env.API_KEY) {
      console.log(`No API_KEY set. Temporary admin key for this run: ${app.locals.apiKey}`);
    }
  });
}

startServer();
