import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from './rabbitmq.constants';

@Injectable()
export class RabbitMqTopologyService implements OnModuleInit {
  private conn!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  async onModuleInit() {
    this.conn = await amqp.connect(process.env.RABBITMQ_URL!);
    this.channel = await this.conn.createChannel();

    await this.channel.assertExchange(RABBITMQ_EXCHANGES.AGENT, 'topic', {
      durable: true,
    });
    await this.channel.assertExchange(RABBITMQ_EXCHANGES.RETRY, 'topic', {
      durable: true,
    });
    await this.channel.assertExchange(RABBITMQ_EXCHANGES.DLX, 'topic', {
      durable: true,
    });

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

    await this.assertRetryQueue(
      RABBITMQ_QUEUES.EVIDENCE_RETRY,
      RABBITMQ_ROUTING_KEYS.EVIDENCE,
      15000,
    );
    await this.assertRetryQueue(
      RABBITMQ_QUEUES.SPEND_RETRY,
      RABBITMQ_ROUTING_KEYS.SPEND,
      15000,
    );
    await this.assertRetryQueue(
      RABBITMQ_QUEUES.FORECAST_RETRY,
      RABBITMQ_ROUTING_KEYS.FORECAST,
      15000,
    );
    await this.assertRetryQueue(
      RABBITMQ_QUEUES.RECOMMENDATION_RETRY,
      RABBITMQ_ROUTING_KEYS.RECOMMENDATION,
      15000,
    );

    await this.channel.assertQueue(RABBITMQ_QUEUES.DLQ, { durable: true });
    await this.channel.bindQueue(
      RABBITMQ_QUEUES.DLQ,
      RABBITMQ_EXCHANGES.DLX,
      '#',
    );
  }

  private async assertMainQueue(queue: string, routingKey: string) {
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
    await this.channel.assertQueue(queue, {
      durable: true,
      messageTtl: ttlMs,
      deadLetterExchange: RABBITMQ_EXCHANGES.AGENT,
      deadLetterRoutingKey: routingKey,
    });
    await this.channel.bindQueue(queue, RABBITMQ_EXCHANGES.RETRY, routingKey);
  }
}
