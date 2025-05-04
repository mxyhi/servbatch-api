import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CommandMonitorsService } from './services/command-monitors.service';
import { SshService } from '../ssh/ssh.service';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

@Injectable()
export class CommandMonitorService {
  private readonly logger = new Logger(CommandMonitorService.name);
  private isProcessing = false;
  private runningMonitors = new Set<number>(); // 用于追踪正在处理的监控器ID
  private maxConcurrentMonitors = 10; // 最大并发处理的监控器数量

  // 缓存实现
  private monitorsCache: CacheEntry<any[]> | null = null;
  private readonly cacheTTL = 60000; // 缓存有效期，单位毫秒

  constructor(
    @Inject(forwardRef(() => CommandMonitorsService))
    private readonly commandMonitorsService: CommandMonitorsService,
    private readonly sshService: SshService,
  ) {}

  @Interval(10000) // 每10秒执行一次
  async checkCommands() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.log('开始检查命令监控...');

    try {
      // 每次检查前先清除缓存，确保获取最新数据
      this.invalidateCache();

      // 获取所有启用的命令监控
      const monitors = await this.getCachedEnabledMonitors();

      if (monitors.length === 0) {
        this.logger.log('没有启用的命令监控');
        return;
      }

      this.logger.log(`找到 ${monitors.length} 个启用的命令监控`);

      // 创建Promise数组但限制并发数量
      const promises: Promise<void>[] = [];
      let currentlyRunning = 0;

      // 处理每个命令监控
      for (const monitor of monitors) {
        // 如果当前正在处理的监控器达到最大限制或者该监控器已经在处理中，则跳过
        if (
          currentlyRunning >= this.maxConcurrentMonitors ||
          this.runningMonitors.has(monitor.id)
        ) {
          continue;
        }

        // 标记该监控器为正在处理
        this.runningMonitors.add(monitor.id);
        currentlyRunning++;

        // 创建一个处理监控器的Promise并添加到数组中
        const promise = this.processMonitor(monitor).finally(() => {
          // 完成后从正在处理集合中移除
          this.runningMonitors.delete(monitor.id);
          currentlyRunning--;
        });

        promises.push(promise);
      }

      // 等待所有启动的监控处理完成
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (error) {
      this.logger.error(`检查命令监控时出错: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
      this.logger.log('命令监控检查完成');
    }
  }

  /**
   * 获取缓存的启用监控器，如果缓存过期则重新获取
   */
  private async getCachedEnabledMonitors(): Promise<any[]> {
    const now = Date.now();

    // 如果缓存有效，直接返回缓存值
    if (
      this.monitorsCache &&
      now - this.monitorsCache.timestamp < this.cacheTTL
    ) {
      return this.monitorsCache.value;
    }

    // 缓存无效，从数据库获取
    const monitors = await this.commandMonitorsService.getAllEnabledMonitors();

    // 更新缓存
    this.monitorsCache = {
      value: monitors,
      timestamp: now,
    };

    return monitors;
  }

  /**
   * 处理单个监控器
   */
  private async processMonitor(monitor: any): Promise<void> {
    try {
      // 先验证监控是否仍然存在
      try {
        await this.commandMonitorsService.findOne(monitor.id);
      } catch (error) {
        // 如果监控不存在，清除缓存并跳过处理
        this.invalidateCache();
        this.logger.warn(`命令监控 ID ${monitor.id} 不存在，跳过处理`);
        return;
      }

      // 执行检查命令
      const checkResult = await this.sshService.executeCommand(
        monitor.serverId,
        monitor.checkCommand,
      );

      // 记录检查结果
      const executed = checkResult.exitCode !== 0;
      let executeOutput: string | undefined;
      let executeExitCode: number | undefined;

      // 如果检查命令返回非0，则执行执行命令
      if (executed) {
        this.logger.log(
          `服务器 ${monitor.serverId} 上的命令监控 "${monitor.name}" 检测到命令未运行，开始执行命令`,
        );

        const executeResult = await this.sshService.executeCommand(
          monitor.serverId,
          monitor.executeCommand,
        );

        executeOutput = executeResult.stdout + '\n' + executeResult.stderr;
        executeExitCode = executeResult.exitCode;

        this.logger.log(
          `服务器 ${monitor.serverId} 上的命令监控 "${monitor.name}" 执行完成，退出码: ${executeExitCode}`,
        );
      }

      // 再次验证监控是否仍然存在（可能在执行过程中被删除）
      try {
        await this.commandMonitorsService.findOne(monitor.id);
      } catch (error) {
        // 如果监控不存在，清除缓存并跳过记录
        this.invalidateCache();
        this.logger.warn(`命令监控 ID ${monitor.id} 不存在，跳过记录执行结果`);
        return;
      }

      // 记录执行结果
      await this.commandMonitorsService.recordExecution(
        monitor.id,
        monitor.serverId,
        checkResult.stdout + '\n' + checkResult.stderr,
        checkResult.exitCode,
        executed,
        executeOutput,
        executeExitCode,
      );
    } catch (error) {
      this.logger.error(
        `处理命令监控 "${monitor.name}" 时出错: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 清除缓存
   */
  public invalidateCache(): void {
    this.monitorsCache = null;
    this.logger.log('命令监控缓存已清除');
  }
}
