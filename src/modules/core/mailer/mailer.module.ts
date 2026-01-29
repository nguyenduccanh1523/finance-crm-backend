import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';

@Module({
  imports: [
    NestMailerModule.forRoot({
      transport: {
        host: process.env.MAIL_SERVER,
        port: Number(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      },
      defaults: {
        from: `"Finance CRM" <${process.env.MAIL_FROM}>`,
      },
      template: {
        dir: path.join(process.cwd(), 'src/modules/core/mailer/templates'),
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailerModule {}
