import { cleanEnv, str, num, url } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: num({ default: 3001 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),
  FRONTEND_URL: url({ default: 'http://localhost:5173' }),
  SMTP_HOST: str({ default: 'smtp.gmail.com' }),
  SMTP_PORT: num({ default: 587 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  EMAIL_FROM: str({ default: 'noreply@skillshare-circles.com' }),
  GEMINI_API_KEY: str({ default: '' }),
  UPLOAD_DIR: str({ default: './uploads' }),
  MAX_FILE_SIZE: num({ default: 10485760 }),
  RATE_LIMIT_WINDOW_MS: num({ default: 900000 }),
  RATE_LIMIT_MAX: num({ default: 100 }),
  AUTH_RATE_LIMIT_MAX: num({ default: 5 }),
});
