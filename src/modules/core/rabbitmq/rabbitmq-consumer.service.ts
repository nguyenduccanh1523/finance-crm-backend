import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

export type RabbitMqConsumeHandler<T = any> = (message: T) => Promise<void>;

@Injectable()
export class RabbitMqConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqConsumerService.name);

  private conn?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  private readonly rabbitmqUrl =
    process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  private async connect() {
    if (this.channel) return;

    this.conn = await amqp.connect(this.rabbitmqUrl);
    this.channel = await this.conn.createChannel();

    await this.channel.prefetch(1);

    this.conn.on('error', (error) => {
      this.logger.error('RabbitMQ consumer connection error', error);
    });

    this.conn.on('close', () => {
      this.logger.warn('RabbitMQ consumer connection closed');
      this.conn = undefined;
      this.channel = undefined;
    });

    this.logger.log('RabbitMQ consumer initialized');
  }

  async consume<T = any>(params: {
    queueName: string;
    handler: RabbitMqConsumeHandler<T>;
  }) {
    await this.connect();

    if (!this.channel) {
      throw new Error('RabbitMQ consumer channel is not initialized');
    }

    await this.channel.assertQueue(params.queueName, {
      durable: true,
    });

    await this.channel.consume(params.queueName, async (msg) => {
      if (!msg) return;

      try {
        const raw = msg.content.toString();
        const parsed = JSON.parse(raw) as T;

        await params.handler(parsed);

        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error(
          `RabbitMQ consume failed. queue=${params.queueName}`,
          error,
        );

        /**
         * Không requeue vô hạn.
         * Retry thật sẽ do Agent xử lý bằng cách publish lại task
         * hoặc đẩy sang retry exchange ở bước nâng cấp sau.
         */
        this.channel?.nack(msg, false, false);
      }
    });

    this.logger.log(`RabbitMQ consuming queue=${params.queueName}`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.conn?.close();
  }
}
