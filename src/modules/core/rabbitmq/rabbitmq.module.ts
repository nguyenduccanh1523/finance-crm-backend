import { Global, Module } from '@nestjs/common';

import { RabbitMqTopologyService } from './rabbitmq-topology.service';
import { RabbitMqPublisherService } from './rabbitmq-publisher.service';
import { RabbitMqConsumerService } from './rabbitmq-consumer.service';

@Global()
@Module({
  providers: [
    RabbitMqTopologyService,
    RabbitMqPublisherService,
    RabbitMqConsumerService,
  ],
  exports: [
    RabbitMqTopologyService,
    RabbitMqPublisherService,
    RabbitMqConsumerService,
  ],
})
export class RabbitMqModule {}
