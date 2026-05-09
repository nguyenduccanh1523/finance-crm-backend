import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisherService.name);

  private conn?: amqp.ChannelModel;
  private channel?: amqp.ConfirmChannel;

  private readonly rabbitmqUrl =
    process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    this.conn = await amqp.connect(this.rabbitmqUrl);
    this.channel = await this.conn.createConfirmChannel();

    this.conn.on('error', (error) => {
      this.logger.error('RabbitMQ publisher connection error', error);
    });

    this.conn.on('close', () => {
      this.logger.warn('RabbitMQ publisher connection closed');
      this.conn = undefined;
      this.channel = undefined;
    });

    this.logger.log('RabbitMQ publisher initialized');
  }

  async publish(exchange: string, routingKey: string, payload: any) {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ publisher channel is not initialized');
    }

    const body = Buffer.from(JSON.stringify(payload));

    const messageId = payload?.messageId ?? payload?.message_id ?? undefined;

    const correlationId =
      payload?.correlationId ?? payload?.correlation_id ?? messageId;

    const published = this.channel.publish(exchange, routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      timestamp: Date.now(),
      messageId,
      correlationId,
      persistent: true,
    });

    if (!published) {
      this.logger.warn(
        `RabbitMQ publish returned false. exchange=${exchange}, routingKey=${routingKey}`,
      );
    }

    await this.channel.waitForConfirms();

    this.logger.debug(
      `Published message to exchange=${exchange}, routingKey=${routingKey}`,
    );
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.conn?.close();
  }
}
