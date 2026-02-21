import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinCircle(circleId: string): void {
  getSocket().emit('circle:join', circleId);
}

export function leaveCircle(circleId: string): void {
  getSocket().emit('circle:leave', circleId);
}

export function sendMessage(circleId: string, content: string): void {
  getSocket().emit('message:send', { circleId, content });
}

export function startTyping(circleId: string): void {
  getSocket().emit('typing:start', circleId);
}

export function stopTyping(circleId: string): void {
  getSocket().emit('typing:stop', circleId);
}
