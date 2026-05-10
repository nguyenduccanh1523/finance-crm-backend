import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';

import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_RETRY_TTL_MS,
  RABBITMQ_ROUTING_KEYS,
} from './rabbitmq.constants';

@Injectable()
export class RabbitMqTopologyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqTopologyService.name);

  private conn?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  private readonly rabbitmqUrl =
    process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  async onModuleInit() {
    await this.connect();
    await this.setupTopology();
  }

  private async connect() {
    this.conn = await amqp.connect(this.rabbitmqUrl);
    this.channel = await this.conn.createChannel();

    this.conn.on('error', (error) => {
      this.logger.error('RabbitMQ topology connection error', error);
    });

    this.conn.on('close', () => {
      this.logger.warn('RabbitMQ topology connection closed');
    });

    this.logger.log('RabbitMQ topology connection initialized');
  }

  private async setupTopology() {
    if (!this.channel) {
      throw new Error('RabbitMQ topology channel is not initialized');
    }

    await this.channel.assertExchange(RABBITMQ_EXCHANGES.AGENT, 'topic', {
      durable: true,
    });

    await this.channel.assertExchange(RABBITMQ_EXCHANGES.RETRY, 'topic', {
      durable: true,
    });

    await this.channel.assertExchange(RABBITMQ_EXCHANGES.DLX, 'topic', {
      durable: true,
    });

    /**
     * Main queues
     */
    await this.assertMainQueue(
      RABBITMQ_QUEUES.FINANCE_KNOWLEDGE_SYNC,
      RABBITMQ_ROUTING_KEYS.FINANCE_KNOWLEDGE_SYNC,
    );

    await this.assertMainQueue(
      RABBITMQ_QUEUES.EVIDENCE,
      RABBITMQ_ROUTING_KEYS.EVIDENCE,
    );

    await this.assertMainQueue(
      RABBITMQ_QUEUES.SPEND,
      RABBITMQ_ROUTING_KEYS.SPEND,
    );

    await this.assertMainQueue(
      RABBITMQ_QUEUES.FORECAST,
      RABBITMQ_ROUTING_KEYS.FORECAST,
    );

    await this.assertMainQueue(
      RABBITMQ_QUEUES.RECOMMENDATION,
      RABBITMQ_ROUTING_KEYS.RECOMMENDATION,
    );

    /**
     * Retry queues
     */
    await this.assertRetryQueue(
      RABBITMQ_QUEUES.FINANCE_KNOWLEDGE_SYNC_RETRY,
      RABBITMQ_ROUTING_KEYS.FINANCE_KNOWLEDGE_SYNC,
      RABBITMQ_RETRY_TTL_MS.FINANCE_KNOWLEDGE_SYNC,
    );

    await this.assertRetryQueue(
      RABBITMQ_QUEUES.EVIDENCE_RETRY,
      RABBITMQ_ROUTING_KEYS.EVIDENCE,
      RABBITMQ_RETRY_TTL_MS.DEFAULT,
    );

    await this.assertRetryQueue(
      RABBITMQ_QUEUES.SPEND_RETRY,
      RABBITMQ_ROUTING_KEYS.SPEND,
      RABBITMQ_RETRY_TTL_MS.DEFAULT,
    );

    await this.assertRetryQueue(
      RABBITMQ_QUEUES.FORECAST_RETRY,
      RABBITMQ_ROUTING_KEYS.FORECAST,
      RABBITMQ_RETRY_TTL_MS.DEFAULT,
    );

    await this.assertRetryQueue(
      RABBITMQ_QUEUES.RECOMMENDATION_RETRY,
      RABBITMQ_ROUTING_KEYS.RECOMMENDATION,
      RABBITMQ_RETRY_TTL_MS.DEFAULT,
    );

    /**
     * DLQ
     */
    await this.channel.assertQueue(RABBITMQ_QUEUES.DLQ, {
      durable: true,
    });

    await this.channel.bindQueue(
      RABBITMQ_QUEUES.DLQ,
      RABBITMQ_EXCHANGES.DLX,
      '#',
    );

    this.logger.log('RabbitMQ topology setup completed');
  }

  private async assertMainQueue(queue: string, routingKey: string) {
    if (!this.channel) {
      throw new Error('RabbitMQ topology channel is not initialized');
    }

    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: RABBITMQ_EXCHANGES.DLX,
      deadLetterRoutingKey: routingKey,
    });

    await this.channel.bindQueue(queue, RABBITMQ_EXCHANGES.AGENT, routingKey);
  }

  private async assertRetryQueue(
    queue: string,
    routingKey: string,
    ttlMs: number,
  ) {
    if (!this.channel) {
      throw new Error('RabbitMQ topology channel is not initialized');
    }

    await this.channel.assertQueue(queue, {
      durable: true,
      messageTtl: ttlMs,
      deadLetterExchange: RABBITMQ_EXCHANGES.AGENT,
      deadLetterRoutingKey: routingKey,
    });

    await this.channel.bindQueue(queue, RABBITMQ_EXCHANGES.RETRY, routingKey);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.conn?.close();
  }
}
