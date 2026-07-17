import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { rateLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import dashboardRoutes from './routes/dashboard.routes';
import caseRoutes from './routes/cases.routes';
import clientRoutes from './routes/clients.routes';
import documentRoutes from './routes/documents.routes';
import taskRoutes from './routes/tasks.routes';
import calendarRoutes from './routes/calendar.routes';
import aiRoutes from './routes/ai.routes';

const app = express();
const globalPrefix = '/api';
const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS?.split(',').map((origin) => origin.trim()) ?? []),
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://pryrolaw.vercel.app',
  ].filter((origin): origin is string => Boolean(origin)),
);

// ── Security ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);

// ── General middleware ─────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Static uploads ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use(`${globalPrefix}/`, rateLimiter);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use(`${globalPrefix}/auth`, authRoutes);
app.use(`${globalPrefix}/profile`, profileRoutes);
app.use(`${globalPrefix}/dashboard`, dashboardRoutes);
app.use(`${globalPrefix}/cases`, caseRoutes);
app.use(`${globalPrefix}/clients`, clientRoutes);
app.use(`${globalPrefix}/documents`, documentRoutes);
app.use(`${globalPrefix}/tasks`, taskRoutes);
app.use(`${globalPrefix}/calendar`, calendarRoutes);
app.use(`${globalPrefix}/ai`, aiRoutes);

// ── Error handling ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
