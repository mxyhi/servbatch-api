import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CommandMonitorsService } from './command-monitors.service';
import { SshService } from '../ssh/ssh.service';

@Injectable()
export class CommandMonitorService {
  private readonly logger = new Logger(CommandMonitorService.name);
  private isProcessing = false;

  constructor(
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
      // 获取所有启用的命令监控
      const monitors =
        await this.commandMonitorsService.getAllEnabledMonitors();

      if (monitors.length === 0) {
        this.logger.log('没有启用的命令监控');
        return;
      }

      this.logger.log(`找到 ${monitors.length} 个启用的命令监控`);

      // 处理每个命令监控
      for (const monitor of monitors) {
        try {
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
          } else {
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
    } catch (error) {
      this.logger.error(`检查命令监控时出错: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
      this.logger.log('命令监控检查完成');
    }
  }
}
