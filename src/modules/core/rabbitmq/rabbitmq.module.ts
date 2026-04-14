import { Global, Module } from '@nestjs/common';
import { RabbitMqTopologyService } from './rabbitmq-topolgy.service';
import { RabbitMqPublisherService } from './rabbitmq-publisher.service';

@Global()
@Module({
  providers: [RabbitMqTopologyService, RabbitMqPublisherService],
  exports: [RabbitMqTopologyService, RabbitMqPublisherService],
})
export class RabbitMqModule {}
