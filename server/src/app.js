import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import destinations from './routes/destinations.js';
import itinerary from './routes/itinerary.js';
import { HttpError, notFound } from './lib/errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(here, '..', '..', 'client', 'dist');

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '20kb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  });

  app.use('/api', destinations);
  app.use('/api/trips', itinerary);

  app.use('/api', (req, _res, next) => next(notFound(`No route for ${req.method} ${req.originalUrl}`)));

  // In production the built React app is served from here as well, so the
  // whole thing deploys as one service.
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { message: 'Request body is not valid JSON.', code: 'BAD_REQUEST' } });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: { message: err.message, code: 'BAD_REQUEST' } });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { message: err.message, code: err.code } });
    }
    console.error(err);
    res.status(500).json({ error: { message: 'Something went wrong on our side.', code: 'SERVER_ERROR' } });
  });

  return app;
}
