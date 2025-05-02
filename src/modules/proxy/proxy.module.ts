import { Module } from '@nestjs/common';
import { ProxyGateway } from './proxy.gateway';
import { ProxyService } from './proxy.service';
import { ProxyDocsController } from './proxy-docs.controller';

@Module({
  controllers: [ProxyDocsController],
  providers: [ProxyGateway, ProxyService],
  exports: [ProxyGateway, ProxyService],
})
export class ProxyModule {}
