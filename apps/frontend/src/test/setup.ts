import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('@/lib/socket', () => ({
  getSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false })),
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  joinCircle: vi.fn(),
  leaveCircle: vi.fn(),
  sendMessage: vi.fn(),
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
}));
