// src/app.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRateLimit, simultaneousConnectionLimit } from './middleware/rate-limit.js';
import { config } from './config/index.js';
import { initJobs } from './jobs/hourly-summary.js';

export function createApp() {  
  const app = express();
  const rawBodySaver = (req: express.Request, _res: express.Response, buf: Buffer) => {
    if (buf?.length) {
      (req as any).rawBody = buf.toString('utf8');
    }
  };

  initJobs().catch(err => console.error("Job Initialization Failed:", err));
  // Middleware
  app.use(simultaneousConnectionLimit);
  app.use(cors({
    origin: config.corsOrigin || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-dev-test']
  }));
  app.use(express.json({ limit: '5mb', type: ['application/json', 'application/*+json'], verify: rawBodySaver }));
  app.use(express.urlencoded({ limit: '5mb', extended: true, verify: rawBodySaver }));
  app.use(express.raw({ limit: '5mb', type: ['multipart/form-data'], verify: rawBodySaver }));
  app.use(express.text({ type: ['text/plain'], verify: rawBodySaver }));
  app.use(morgan('dev'));

  // API Routes
  app.use('/api', apiRateLimit, routes);

  // Error handling
  app.use(errorHandler);

  return app;
}
