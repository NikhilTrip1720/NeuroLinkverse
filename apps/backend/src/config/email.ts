import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  try {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('Email not configured, skipping send', { to, subject });
      return;
    }

    await transporter.sendMail({
      from: `"Skillshare Circles" <${env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    logger.info('Email sent', { to, subject });
  } catch (error) {
    logger.error('Failed to send email', { error, to, subject });
    throw error;
  }
}

export function getVerificationEmailHtml(verifyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Welcome to Skillshare Circles!</h1>
        <p>Please verify your email address to get started.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      </body>
    </html>
  `;
}

export function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">Password Reset</h1>
        <p>You requested a password reset for your Skillshare Circles account.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </body>
    </html>
  `;
}

export function getCircleInviteEmailHtml(
  inviterName: string,
  circleName: string,
  inviteUrl: string,
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1;">You've been invited!</h1>
        <p><strong>${inviterName}</strong> has invited you to join the "<strong>${circleName}</strong>" study circle on Skillshare Circles.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
      </body>
    </html>
  `;
}
