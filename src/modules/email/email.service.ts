import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      console.warn('RESEND_API_KEY not found in environment variables');
    }
    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    firstName?: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    )}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50;">Password Reset Request</h2>
            <p>Hello ${firstName || 'there'},</p>
            <p>We received a request to reset your password for your UAMS account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">This is an automated message from UAMS. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

Hello ${firstName || 'there'},

We received a request to reset your password for your UAMS account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

---
This is an automated message from UAMS. Please do not reply to this email.
    `;

    try {
      await this.resend.emails.send({
        from: this.configService.get<string>(
          'RESEND_FROM_EMAIL',
          'noreply@uasm.oghenekparobor.xyz',
        ),
        to: email,
        subject: 'UAMS - Password Reset Request',
        html,
        text,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error to prevent revealing if email exists
      // Log error for monitoring
    }
  }

  async sendPasswordChangedEmail(
    email: string,
    firstName?: string,
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #27ae60;">Password Successfully Changed</h2>
            <p>Hello ${firstName || 'there'},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you did not make this change, please contact support immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">This is an automated message from UAMS. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Successfully Changed

Hello ${firstName || 'there'},

Your password has been successfully changed.

If you did not make this change, please contact support immediately.

---
This is an automated message from UAMS. Please do not reply to this email.
    `;

    try {
      await this.resend.emails.send({
        from: this.configService.get<string>(
          'RESEND_FROM_EMAIL',
          'noreply@uasm.oghenekparobor.xyz',
        ),
        to: email,
        subject: 'UAMS - Password Changed',
        html,
        text,
      });
    } catch (error) {
      console.error('Failed to send password changed email:', error);
      // Don't throw error - password change was successful
    }
  }
}

