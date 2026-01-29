import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOtp(email: string, otp: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã xác thực đăng ký tài khoản',
      template: './otp', // otp.hbs
      context: { otp },
    });
  }
}
