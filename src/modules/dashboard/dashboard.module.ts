import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { QueueModule } from '../queue/queue.module';
import { ProxiesModule } from '../proxies/proxies.module';

@Module({
  imports: [QueueModule, ProxiesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
