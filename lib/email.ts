/**
 * Email Service for sending OTP, order updates, and notifications
 * Supports both MAIL_* and SMTP_* environment variables via Nodemailer
 */

import nodemailer, { type Transporter } from 'nodemailer';

interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<boolean>;
}

/**
 * Nodemailer Email Provider
 */
class NodemailerProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private from: string;

  constructor() {
    const host = process.env.MAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
    const user = process.env.MAIL_USER || process.env.SMTP_USER || '';
    const pass = process.env.MAIL_PASS || process.env.SMTP_PASS || '';
    const fromAddress =
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      user ||
      'noreply@bakeryshop.com';

    this.from = fromAddress.includes('<')
      ? fromAddress
      : `"Phương Loan Bakery" <${fromAddress}>`;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports (587 STARTTLS)
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      console.warn(
        '[EmailService] SMTP credentials missing (MAIL_USER / MAIL_PASS). Fallback to console output.',
      );
      console.log('=====================================');
      console.log('EMAIL SENT (DEV FALLBACK)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body:', html);
      console.log('=====================================');
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });

      console.info(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email via SMTP:', error);
      return false;
    }
  }
}

/**
 * Console Email Provider (for development / testing)
 */
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    console.log('=====================================');
    console.log('EMAIL SENT (DEV MODE)');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', html);
    console.log('=====================================');
    return true;
  }
}

/**
 * Email Service - unified interface
 */
class EmailService {
  private provider: EmailProvider;

  constructor() {
    const hasSmtpConfig = Boolean(
      (process.env.MAIL_USER && process.env.MAIL_PASS) ||
      (process.env.SMTP_USER && process.env.SMTP_PASS),
    );
    const providerType = (process.env.EMAIL_PROVIDER || '').toLowerCase();

    if (hasSmtpConfig || providerType === 'smtp' || providerType === 'nodemailer') {
      this.provider = new NodemailerProvider();
    } else {
      this.provider = new ConsoleEmailProvider();
    }
  }

  /**
   * Send OTP Email
   */
  async sendOtp(email: string, otp: string): Promise<boolean> {
    const subject = 'Mã xác thực OTP - Phương Loan Bakery';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #b45309; margin: 0; font-size: 22px; font-weight: 700;">Phương Loan Bakery</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Xác thực tài khoản của bạn</p>
        </div>
        
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">Xin chào,</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">Bạn đang thực hiện thao tác xác thực trên hệ thống <strong>Phương Loan Bakery</strong>. Mã OTP xác thực của bạn là:</p>
        
        <div style="background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 8px; padding: 18px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #92400e; margin: 24px 0;">
          ${otp}
        </div>
        
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
          ⏱️ Mã này có hiệu lực trong vòng <strong>5 phút</strong>.<br>
          🔒 Vì lý do bảo mật, tuyệt đối <strong>không chia sẻ</strong> mã xác thực này cho bất kỳ ai.
        </p>
        
        <hr style="margin: 28px 0; border: none; border-top: 1px solid #f3f4f6;">
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.4; text-align: center;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ bộ phận hỗ trợ khách hàng của Phương Loan Bakery.
        </p>
      </div>
    `;

    return await this.provider.sendEmail(email, subject, html);
  }

  /**
   * Send Welcome Email
   */
  async sendWelcome(email: string, name?: string): Promise<boolean> {
    const subject = 'Chào mừng bạn đến với Phương Loan Bakery';
    const displayName = name || 'bạn';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #b45309; margin: 0; font-size: 22px; font-weight: 700;">Phương Loan Bakery</h2>
        </div>
        
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">Xin chào <strong>${displayName}</strong>,</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">Cảm ơn bạn đã đăng ký tài khoản thành viên tại <strong>Phương Loan Bakery</strong>. Chúng tôi rất hân hạnh được đồng hành và mang đến cho bạn những sản phẩm bánh tươi ngon, chất lượng nhất!</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="${appUrl}" style="display: inline-block; padding: 12px 28px; background: #d97706; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 15px;">
            Khám phá thực đơn ngay
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">Trân trọng,<br><strong>Đội ngũ Phương Loan Bakery</strong></p>
      </div>
    `;

    return await this.provider.sendEmail(email, subject, html);
  }

  /**
   * Send generic email
   */
  async send(to: string, subject: string, html: string): Promise<boolean> {
    return await this.provider.sendEmail(to, subject, html);
  }
}

// Singleton instance
export const emailService = new EmailService();
