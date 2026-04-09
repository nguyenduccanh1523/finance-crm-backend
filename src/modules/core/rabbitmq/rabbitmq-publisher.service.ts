import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqPublisherService implements OnModuleInit {
  private conn!: amqp.ChannelModel;
  private channel!: amqp.ConfirmChannel;

  async onModuleInit() {
    this.conn = await amqp.connect(process.env.RABBITMQ_URL!);
    this.channel = await this.conn.createConfirmChannel();
  }

  async publish(exchange: string, routingKey: string, payload: any) {
    const body = Buffer.from(JSON.stringify(payload));

    this.channel.publish(exchange, routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      timestamp: Date.now(),
      messageId: payload.message_id,
      correlationId: payload.correlation_id,
      persistent: true,
    });

    await this.channel.waitForConfirms();
  }
}
