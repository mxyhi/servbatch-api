import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CleanupByDateDto } from '../dto/cleanup-by-date.dto';
import { CleanupByStatusDto } from '../dto/cleanup-by-status.dto';
import { CleanupResultDto } from '../dto/cleanup-result.dto';
import { CleanupUtil, ErrorHandler, DateField } from '../../../common';
import { TasksService } from '../../tasks/tasks.service';
import { ServersService } from '../../servers/servers.service';

/**
 * 任务执行记录清理服务
 * 提供清理功能
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly serversService: ServersService,
  ) {}

  /**
   * 根据日期范围清理任务执行历史记录
   * @param cleanupDto 清理参数
   * @returns 清理结果
   */
  async cleanupByDate(cleanupDto: CleanupByDateDto): Promise<CleanupResultDto> {
    const { startDate, endDate } = cleanupDto;

    return CleanupUtil.cleanupByDateRange(
      this.prisma,
      'taskExecution',
      DateField.CREATED_AT,
      startDate,
      endDate,
      {},
      this.logger,
      '任务执行历史记录',
    );
  }

  /**
   * 根据状态清理任务执行历史记录
   * @param cleanupDto 清理参数
   * @returns 清理结果
   */
  async cleanupByStatus(
    cleanupDto: CleanupByStatusDto,
  ): Promise<CleanupResultDto> {
    try {
      const { statuses } = cleanupDto;

      // 执行删除操作
      const { count } = await this.prisma.taskExecution.deleteMany({
        where: {
          status: {
            in: statuses,
          },
        },
      });

      this.logger.log(
        `已清理 ${count} 条状态为 ${statuses.join(', ')} 的任务执行历史记录`,
      );

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理 ${count} 条状态为 ${statuses.join(', ')} 的任务执行历史记录`,
      };
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        '清理任务执行历史记录失败',
      );

      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${err.message}`,
      };
    }
  }

  /**
   * 清理指定任务的所有执行历史记录
   * @param taskId 任务ID
   * @returns 清理结果
   */
  async cleanupByTaskId(taskId: number): Promise<CleanupResultDto> {
    try {
      // 验证任务是否存在
      await this.tasksService.findOne(taskId);

      // 执行删除操作
      const { count } = await this.prisma.taskExecution.deleteMany({
        where: { taskId },
      });

      this.logger.log(`已清理任务ID ${taskId} 的 ${count} 条执行历史记录`);

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理任务ID ${taskId} 的 ${count} 条执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理任务ID ${taskId} 的执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }

  /**
   * 清理指定服务器的所有执行历史记录
   * @param serverId 服务器ID
   * @returns 清理结果
   */
  async cleanupByServerId(serverId: number): Promise<CleanupResultDto> {
    try {
      // 验证服务器是否存在
      await this.serversService.findOne(serverId);

      // 执行删除操作
      const { count } = await this.prisma.taskExecution.deleteMany({
        where: { serverId },
      });

      this.logger.log(`已清理服务器ID ${serverId} 的 ${count} 条执行历史记录`);

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理服务器ID ${serverId} 的 ${count} 条执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理服务器ID ${serverId} 的执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }
}
