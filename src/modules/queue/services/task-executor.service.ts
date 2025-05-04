import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SshService } from '../../ssh/ssh.service';
import { QueueCacheService } from './queue-cache.service';
import { QueueManagerService } from './queue-manager.service';
import { Task, TaskExecution } from '@prisma/client'; // Import Prisma types
import { CommandResult } from '../../ssh/types/ssh.types'; // Import CommandResult type

// Interface for the result of executeCommandsOnServers to include execution context
interface ExecutionCommandResult extends CommandResult {
  executionId: number;
  success: boolean;
  error?: any;
}

@Injectable()
export class TaskExecutorService {
  private readonly logger = new Logger(TaskExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sshService: SshService,
    private readonly cacheService: QueueCacheService,
    private readonly queueManager: QueueManagerService,
  ) {}

  /**
   * Executes a specific task from the queue on the designated servers.
   * Migrated from old QueueService.executeTask.
   */
  async executeTask(
    queueId: number,
    taskId: number,
    serverIds: number[],
  ): Promise<void> {
    this.logger.log(
      `Executing Task ID: ${taskId} (Queue ID: ${queueId}) on servers: [${serverIds.join(', ')}]`,
    );
    let task: Task | null = null;
    let executions: TaskExecution[] = [];

    try {
      // 1. Get Task Details (using cache)
      task = await this.getTaskDetails(taskId);
      if (!task) {
        // If task details cannot be found, fail the queue item.
        throw new NotFoundException(`Task with ID ${taskId} not found.`);
      }

      // 2. Create TaskExecution records for each server
      executions = await this.createExecutionRecords(taskId, serverIds);
      if (executions.length !== serverIds.length) {
        this.logger.warn(
          `Mismatch between requested servers (${serverIds.length}) and created executions (${executions.length}) for Task ID ${taskId}`,
        );
        // Decide how to handle this - proceed with created ones or fail? For now, proceed.
      }
      if (executions.length === 0) {
        throw new Error(
          `No TaskExecution records were created for Task ID ${taskId}. Cannot proceed.`,
        );
      }

      // 3. Execute commands concurrently on all servers
      const executionResults = await this.executeCommandsOnServers(
        executions,
        task,
      );

      // 4. Process results and update TaskExecution records
      await this.processExecutionResults(executionResults);

      // 5. Update overall Queue status to 'completed'
      // Check if any execution failed to determine overall status?
      // For now, assume completion if the process didn't throw an error before this point.
      // A more robust approach might check individual execution statuses.
      await this.queueManager.updateQueueStatus(queueId, 'completed');
      this.logger.log(
        `Successfully completed Task ID: ${taskId} (Queue ID: ${queueId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute Task ID: ${taskId} (Queue ID: ${queueId}): ${error.message}`,
        error.stack,
      );
      // Update Queue status to 'failed'
      await this.queueManager.updateQueueStatus(queueId, 'failed');

      // Optionally update any created TaskExecution records to 'failed' if the error occurred before processing results
      if (
        executions.length > 0 &&
        !error.message.includes('No TaskExecution records')
      ) {
        const executionIds = executions.map((ex) => ex.id);
        await this.prisma.taskExecution.updateMany({
          where: { id: { in: executionIds }, status: 'running' }, // Only update those still marked as running
          data: {
            status: 'failed',
            output: `Execution failed due to error: ${error.message}`,
            completedAt: new Date(),
          },
        });
      }
      // Rethrow the error so the QueueProcessorService promise chain can catch it
      throw error;
    }
  }

  /**
   * Gets task details, utilizing the cache service.
   */
  private async getTaskDetails(taskId: number): Promise<Task | null> {
    this.logger.debug(`Getting details for Task ID: ${taskId}`);
    const task = await this.cacheService.getTask(taskId);
    return task; // cacheService handles fetching if not cached
  }

  /**
   * Creates initial TaskExecution records in 'running' state.
   * Migrated from old QueueService.
   */
  private async createExecutionRecords(
    taskId: number,
    serverIds: number[],
  ): Promise<TaskExecution[]> {
    this.logger.debug(
      `Creating execution records for Task ID: ${taskId} on servers: [${serverIds.join(', ')}]`,
    );
    try {
      const createdExecutions = await this.prisma.$transaction(
        serverIds.map((serverId) =>
          this.prisma.taskExecution.create({
            data: {
              taskId,
              serverId,
              status: 'running', // Start as running
              startedAt: new Date(),
            },
          }),
        ),
      );
      this.logger.log(
        `Created ${createdExecutions.length} execution records for Task ID: ${taskId}`,
      );
      return createdExecutions;
    } catch (error) {
      this.logger.error(
        `Error creating execution records for Task ID ${taskId}: ${error.message}`,
        error.stack,
      );
      // If transaction fails, return empty array or rethrow? Rethrow seems safer.
      throw new Error(`Failed to create execution records: ${error.message}`);
    }
  }

  /**
   * Executes the task's command on all specified servers via SSH.
   * Migrated from old QueueService.
   */
  private async executeCommandsOnServers(
    executions: TaskExecution[],
    task: Task,
  ): Promise<PromiseSettledResult<ExecutionCommandResult>[]> {
    this.logger.debug(
      `Executing command "${task.command}" for Task ID: ${task.id} on ${executions.length} servers.`,
    );
    const commandPromises = executions.map(async (execution) => {
      const serverId = execution.serverId;
      try {
        const result = await this.sshService.executeCommand(
          serverId,
          task.command,
          task.timeout || undefined, // Use task timeout if available
        );
        this.logger.debug(
          `Command executed on Server ID: ${serverId} for Execution ID: ${execution.id} (Exit Code: ${result.exitCode})`,
        );
        return {
          ...result,
          executionId: execution.id,
          success: true,
        };
      } catch (error) {
        this.logger.error(
          `Command execution failed on Server ID: ${serverId} for Execution ID: ${execution.id}: ${error.message}`,
        );
        return {
          executionId: execution.id,
          success: false,
          error: error,
          stdout: '', // Provide default empty strings for consistency
          stderr: error.message || 'Command execution failed',
          exitCode: -1, // Indicate failure
        };
      }
    });

    return Promise.allSettled(commandPromises);
  }

  /**
   * Processes the results from command executions and updates TaskExecution records.
   * Migrated from old QueueService.
   */
  private async processExecutionResults(
    results: PromiseSettledResult<ExecutionCommandResult>[],
  ): Promise<void> {
    this.logger.debug(`Processing ${results.length} execution results.`);
    const updatePromises = results.map(async (settledResult) => {
      if (settledResult.status === 'fulfilled') {
        const { executionId, success, error, ...commandResult } =
          settledResult.value;
        if (success) {
          await this.updateSuccessfulExecution(executionId, commandResult);
        } else {
          // Handle cases where executeCommandsOnServers caught an error
          await this.updateFailedExecution(
            executionId,
            error || new Error('Unknown execution error'),
          );
        }
      } else {
        // Handle cases where the promise itself was rejected (should be less common now)
        this.logger.error(
          `Execution promise rejected: ${settledResult.reason}`,
        );
        // Need to find the corresponding executionId if possible, otherwise log broadly.
        // This part is tricky without mapping promises back to execution IDs beforehand.
        // For now, log the reason. A more robust solution might involve passing executionId in the rejection.
      }
    });

    await Promise.all(updatePromises);
    this.logger.debug('Finished processing execution results.');
  }

  /**
   * Updates a TaskExecution record for a successful command execution.
   * Migrated from old QueueService.
   */
  private async updateSuccessfulExecution(
    executionId: number,
    result: CommandResult,
  ): Promise<void> {
    const status = result.exitCode === 0 ? 'completed' : 'failed';
    this.logger.debug(
      `Updating successful execution record ID: ${executionId} to status: ${status}`,
    );
    await this.prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: status,
        output: `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        exitCode: result.exitCode,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Updates a TaskExecution record for a failed command execution.
   * Migrated from old QueueService.
   */
  private async updateFailedExecution(
    executionId: number,
    error: any,
  ): Promise<void> {
    this.logger.warn(`Updating failed execution record ID: ${executionId}`);
    await this.prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        output: error.message || 'Execution failed or promise rejected',
        exitCode: typeof error.exitCode === 'number' ? error.exitCode : -1, // Use exit code from error if available
        completedAt: new Date(),
      },
    });
  }
}
