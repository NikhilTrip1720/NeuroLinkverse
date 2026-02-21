import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { setupSocketServer } from './socket/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import circleRoutes from './routes/circle.routes';
import chatRoutes from './routes/chat.routes';
import taskRoutes from './routes/task.routes';
import resourceRoutes from './routes/resource.routes';
import meetingRoutes from './routes/meeting.routes';
import aiRoutes from './routes/ai.routes';

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", env.FRONTEND_URL],
      },
    },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(generalLimiter);

app.use(
  '/uploads',
  express.static(path.join(process.cwd(), env.UPLOAD_DIR), {
    maxAge: '1d',
    etag: true,
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/circles/:circleId/messages', chatRoutes);
app.use('/api/circles/:circleId/tasks', taskRoutes);
app.use('/api/circles/:circleId/resources', resourceRoutes);
app.use('/api/circles/:circleId/meetings', meetingRoutes);
app.use('/api/ai', aiRoutes);

setupSocketServer(io);

app.use(notFoundHandler);
app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    server.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        port: env.PORT,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

bootstrap();

export { app, server, io };
