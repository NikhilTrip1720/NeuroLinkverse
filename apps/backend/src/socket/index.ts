import { Server, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../config/logger';
import { awardXp, updateStreak } from '../services/gamification.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
}

const userSockets = new Map<string, Set<string>>();

export function setupSocketServer(io: Server): void {
  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth.token as string) ||
        (socket.handshake.headers.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('accessToken='))
          ?.split('=')[1]);

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      const authSocket = socket as AuthenticatedSocket;
      authSocket.userId = payload.userId;
      authSocket.username = payload.username;

      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, username } = authSocket;

    logger.info('Socket connected', { userId, socketId: socket.id });

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    updateStreak(userId).catch(() => {});

    socket.on('circle:join', async (circleId: string) => {
      try {
        const member = await prisma.circleMember.findUnique({
          where: { userId_circleId: { userId, circleId } },
        });
        if (member) {
          await socket.join(`circle:${circleId}`);
          logger.debug('User joined circle room', { userId, circleId });
        }
      } catch (error) {
        logger.error('Error joining circle', { error, userId, circleId });
      }
    });

    socket.on('circle:leave', (circleId: string) => {
      socket.leave(`circle:${circleId}`);
    });

    socket.on(
      'message:send',
      async (data: { circleId: string; content: string; type?: string }) => {
        try {
          const member = await prisma.circleMember.findUnique({
            where: { userId_circleId: { userId, circleId: data.circleId } },
          });

          if (!member) {
            socket.emit('error', { message: 'Not a member of this circle' });
            return;
          }

          if (!data.content?.trim()) {
            socket.emit('error', { message: 'Message content required' });
            return;
          }

          if (data.content.length > 2000) {
            socket.emit('error', { message: 'Message too long' });
            return;
          }

          const message = await prisma.message.create({
            data: {
              content: data.content.trim(),
              circleId: data.circleId,
              authorId: userId,
              type: (data.type as 'TEXT' | 'FILE') || 'TEXT',
            },
            select: {
              id: true,
              content: true,
              circleId: true,
              authorId: true,
              type: true,
              fileUrl: true,
              fileName: true,
              isEdited: true,
              createdAt: true,
              updatedAt: true,
              author: {
                select: { id: true, username: true, displayName: true, avatarUrl: true },
              },
            },
          });

          io.to(`circle:${data.circleId}`).emit('message:new', message);

          await awardXp(userId, 'SEND_MESSAGE');
        } catch (error) {
          logger.error('Error sending message', { error, userId });
          socket.emit('error', { message: 'Failed to send message' });
        }
      },
    );

    socket.on('typing:start', (circleId: string) => {
      socket.to(`circle:${circleId}`).emit('typing:start', { userId, username, circleId });
    });

    socket.on('typing:stop', (circleId: string) => {
      socket.to(`circle:${circleId}`).emit('typing:stop', { userId, circleId });
    });

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      logger.info('Socket disconnected', { userId, socketId: socket.id });
    });
  });
}

export function emitToUser(io: Server, userId: string, event: string, data: unknown): void {
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}
