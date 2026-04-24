// src/app.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config/index.js';
import { initJobs } from './jobs/hourly-summary.js';

export function createApp() {  
  const app = express();
  initJobs().catch(err => console.error("Job Initialization Failed:", err));
  // Middleware
  app.use(cors({
    origin: config.corsOrigin || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-dev-test']
  }));
  app.use(express.json());
  app.use(morgan('dev'));

  // API Routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}
