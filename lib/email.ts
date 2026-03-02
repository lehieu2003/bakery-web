/**
 * Email Service for sending OTP and notifications
 */

interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<boolean>;
}

/**
 * Nodemailer Email Provider
 */
class NodemailerProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    // Use nodemailer or any email service
    // This is a placeholder - implement based on your email service

    try {
      // Example with nodemailer (you need to install: npm install nodemailer)
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: process.env.SMTP_PORT,
      //   secure: true,
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASS,
      //   },
      // });
      // await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });

      console.log('=====================================');
      console.log('EMAIL SENT (DEV MODE)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body:', html);
      console.log('=====================================');

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }
}

/**
 * Console Email Provider (for development)
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
    const providerType = process.env.EMAIL_PROVIDER || 'console';

    switch (providerType) {
      case 'nodemailer':
        this.provider = new NodemailerProvider();
        break;
      default:
        this.provider = new ConsoleEmailProvider();
    }
  }

  /**
   * Send OTP Email
   */
  async sendOtp(email: string, otp: string): Promise<boolean> {
    const subject = 'Mã xác thực OTP - Bakery Shop';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Mã xác thực OTP</h2>
        <p>Xin chào,</p>
        <p>Mã OTP của bạn là:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
        <p style="color: #d9534f;">⚠️ Không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">
          Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
        </p>
      </div>
    `;

    return await this.provider.sendEmail(email, subject, html);
  }

  /**
   * Send Welcome Email
   */
  async sendWelcome(email: string, name?: string): Promise<boolean> {
    const subject = 'Chào mừng bạn đến với Bakery Shop';
    const displayName = name || 'bạn';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Chào mừng đến với Bakery Shop!</h2>
        <p>Xin chào ${displayName},</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại Bakery Shop.</p>
        <p>Chúng tôi rất vui được phục vụ bạn những sản phẩm bánh ngon nhất!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; padding: 12px 24px; background: #5cb85c; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Bắt đầu mua sắm
        </a>
        <p>Trân trọng,<br>Đội ngũ Bakery Shop</p>
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
