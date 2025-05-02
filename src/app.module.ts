import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { ServersModule } from './modules/servers/servers.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { QueueModule } from './modules/queue/queue.module';
import { SshModule } from './modules/ssh/ssh.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TaskExecutionsModule } from './modules/task-executions/task-executions.module';
import { CommandMonitorsModule } from './modules/command-monitors/command-monitors.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { ProxiesModule } from './modules/proxies/proxies.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // 注册事件发射器模块
    EventEmitterModule.forRoot(),
    // 注册定时任务模块
    ScheduleModule.forRoot(),
    // 注册Prisma模块
    PrismaModule,
    // 注册业务模块
    ServersModule,
    TasksModule,
    QueueModule,
    SshModule,
    ProxyModule,
    ProxiesModule,
    DashboardModule,
    TaskExecutionsModule,
    CommandMonitorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
