/**
 * SMS Provider Interface
 * Support for multiple providers: Twilio, FPT, Viettel, etc.
 */

interface SmsProvider {
  sendSms(phone: string, message: string): Promise<boolean>;
}

/**
 * Twilio SMS Provider
 */
class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async sendSms(phone: string, message: string): Promise<boolean> {
    if (!this.accountSid || !this.authToken) {
      console.error('Twilio credentials not configured');
      return false;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        'base64',
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: this.fromNumber,
          Body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Twilio SMS error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send SMS via Twilio:', error);
      return false;
    }
  }
}

/**
 * Vietnam SMS Provider (FPT/Viettel/CMC)
 * You'll need to implement based on your chosen provider's API
 */
class VietnamSmsProvider implements SmsProvider {
  private apiKey: string;
  private apiUrl: string;
  private brandName: string;

  constructor() {
    this.apiKey = process.env.VN_SMS_API_KEY || '';
    this.apiUrl = process.env.VN_SMS_API_URL || '';
    this.brandName = process.env.VN_SMS_BRAND_NAME || 'BakeryShop';
  }

  async sendSms(phone: string, message: string): Promise<boolean> {
    if (!this.apiKey || !this.apiUrl) {
      console.error('Vietnam SMS provider not configured');
      return false;
    }

    try {
      // Example implementation - adjust based on your provider
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          phone: phone,
          message: message,
          brandname: this.brandName,
          // Add other required fields based on your provider
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Vietnam SMS error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send SMS via Vietnam provider:', error);
      return false;
    }
  }
}

/**
 * Console SMS Provider (for development/testing)
 */
class ConsoleSmsProvider implements SmsProvider {
  async sendSms(phone: string, message: string): Promise<boolean> {
    console.log('=====================================');
    console.log('SMS SENT (DEV MODE)');
    console.log('To:', phone);
    console.log('Message:', message);
    console.log('=====================================');
    return true;
  }
}

/**
 * SMS Service - unified interface
 */
class SmsService {
  private provider: SmsProvider;

  constructor() {
    const providerType = process.env.SMS_PROVIDER || 'console';

    switch (providerType) {
      case 'twilio':
        this.provider = new TwilioSmsProvider();
        break;
      case 'vietnam':
        this.provider = new VietnamSmsProvider();
        break;
      default:
        this.provider = new ConsoleSmsProvider();
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const message = `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.`;
    return await this.provider.sendSms(phone, message);
  }

  /**
   * Send generic SMS
   */
  async send(phone: string, message: string): Promise<boolean> {
    return await this.provider.sendSms(phone, message);
  }
}

// Singleton instance
export const smsService = new SmsService();
