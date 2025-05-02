import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { ProxiesService } from '../proxies/proxies.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly proxiesService: ProxiesService,
  ) {}

  async getSummary() {
    const [
      serverCount,
      taskCount,
      executionCount,
      successfulExecutions,
      failedExecutions,
      queueStatus,
    ] = await Promise.all([
      this.prisma.server.count(),
      this.prisma.task.count(),
      this.prisma.taskExecution.count(),
      this.prisma.taskExecution.count({
        where: { status: 'completed' },
      }),
      this.prisma.taskExecution.count({
        where: { status: 'failed' },
      }),
      this.queueService.getQueueStatus(),
    ]);

    return {
      serverCount,
      taskCount,
      executionCount,
      successfulExecutions,
      failedExecutions,
      queueStatus,
    };
  }

  async getRecentExecutions(limit = 10) {
    return this.prisma.taskExecution.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            name: true,
            command: true,
          },
        },
        server: {
          select: {
            name: true,
            host: true,
          },
        },
      },
    });
  }

  async getServerStatus() {
    return this.prisma.server.findMany({
      select: {
        id: true,
        name: true,
        host: true,
        status: true,
        lastChecked: true,
        _count: {
          select: {
            taskExecutions: true,
          },
        },
      },
    });
  }

  async getTaskStats() {
    const tasks = await this.prisma.task.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            taskExecutions: true,
          },
        },
      },
    });

    const taskStats = await Promise.all(
      tasks.map(async (task) => {
        const [successful, failed] = await Promise.all([
          this.prisma.taskExecution.count({
            where: {
              taskId: task.id,
              status: 'completed',
            },
          }),
          this.prisma.taskExecution.count({
            where: {
              taskId: task.id,
              status: 'failed',
            },
          }),
        ]);

        return {
          ...task,
          successfulExecutions: successful,
          failedExecutions: failed,
        };
      }),
    );

    return taskStats;
  }

  async getProxyStatus() {
    // 获取所有代理及其在线状态
    return this.proxiesService.findAll();
  }

  async getSummaryWithProxies() {
    const [summary, proxyStatus] = await Promise.all([
      this.getSummary(),
      this.getProxyStatus(),
    ]);

    // 计算在线和离线代理数量
    const onlineProxies = proxyStatus.filter(
      (proxy) => proxy.status === 'online',
    ).length;
    const offlineProxies = proxyStatus.length - onlineProxies;

    return {
      ...summary,
      proxyCount: proxyStatus.length,
      onlineProxies,
      offlineProxies,
    };
  }
}
