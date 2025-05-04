import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueStatsService } from '../queue/services/queue-stats.service';
import { ProxiesService } from '../proxies/proxies.service';
import { QueueStats } from '../queue/types/queue.types';
import {
  SystemSummary,
  SystemSummaryWithProxies,
} from './interfaces/system-summary.interface';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueStatsService: QueueStatsService, // Updated injection
    private readonly proxiesService: ProxiesService,
  ) {}

  async getSummary(): Promise<SystemSummary> {
    const [
      serverCount,
      onlineServers,
      offlineServers,
      unknownServers,
      taskCount,
      executionCount,
      runningExecutions,
      queuedExecutions,
      successfulExecutions,
      failedExecutions,
      queueStatus,
    ] = await Promise.all([
      this.prisma.server.count(),
      this.prisma.server.count({
        where: { status: 'online' },
      }),
      this.prisma.server.count({
        where: { status: 'offline' },
      }),
      this.prisma.server.count({
        where: { status: 'unknown' },
      }),
      this.prisma.task.count(),
      this.prisma.taskExecution.count(),
      this.prisma.taskExecution.count({
        where: { status: 'running' },
      }),
      this.prisma.taskExecution.count({
        where: { status: 'queued' },
      }),
      this.prisma.taskExecution.count({
        where: { status: 'completed' },
      }),
      this.prisma.taskExecution.count({
        where: { status: 'failed' },
      }),
      this.queueStatsService.getQueueStatus(),
    ]);

    return {
      totalServers: serverCount,
      onlineServers,
      offlineServers,
      unknownServers,
      totalTasks: taskCount,
      totalExecutions: executionCount,
      runningExecutions,
      queuedExecutions,
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
    const result = await this.proxiesService.findAll();
    return result.items;
  }

  async getSummaryWithProxies(): Promise<SystemSummaryWithProxies> {
    const [summary, proxyItems, todayExecutions, totalSuccessful, totalFailed] =
      await Promise.all([
        this.getSummary(),
        this.getProxyStatus(),
        // 获取今日执行数量
        this.prisma.taskExecution.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        // 获取成功执行总数
        this.prisma.taskExecution.count({
          where: { status: 'completed' },
        }),
        // 获取失败执行总数
        this.prisma.taskExecution.count({
          where: { status: 'failed' },
        }),
      ]);

    // 计算在线和离线代理数量
    const onlineProxies = proxyItems.filter(
      (proxy) => proxy.status === 'online',
    ).length;
    const offlineProxies = proxyItems.length - onlineProxies;

    // 计算成功率
    const totalCompleted = totalSuccessful + totalFailed;
    const successRate =
      totalCompleted > 0
        ? Math.round((totalSuccessful / totalCompleted) * 100)
        : 100; // 如果没有完成的任务，则成功率为100%

    return {
      ...summary,
      totalProxies: proxyItems.length,
      onlineProxies,
      offlineProxies,
      executionsToday: todayExecutions,
      successRate,
    };
  }
}
