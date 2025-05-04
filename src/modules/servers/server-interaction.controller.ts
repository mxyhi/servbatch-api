// src/modules/servers/server-interaction.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Delete, // Added
  NotFoundException, // Added
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServerInteractionService } from './server-interaction.service';
import { GetServerDetailsDto } from './dto/get-server-details.dto';
import { GetServerResourcesDto } from './dto/get-server-resources.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { ExecuteCommandResponseDto } from './dto/execute-command-response.dto';
import { TerminalService } from './terminal.service'; // Added
import { CreateTerminalSessionResponseDto } from './dto/create-terminal-session-response.dto'; // Added
import { CloseTerminalSessionResponseDto } from './dto/close-terminal-session-response.dto'; // Added
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming JWT authentication is used
// Import RolesGuard and Roles decorator if needed for authorization
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Role } from '../users/entities/user.entity'; // Assuming Role enum exists

@ApiTags('Servers Interaction')
@ApiBearerAuth() // Indicate that JWT Bearer token is required
@UseGuards(JwtAuthGuard) // Apply JWT authentication guard to the whole controller
// @UseGuards(JwtAuthGuard, RolesGuard) // Example if role-based access is needed
@Controller('servers/:id') // Base path includes the server ID parameter
export class ServerInteractionController {
  constructor(
    private readonly serverInteractionService: ServerInteractionService,
    private readonly terminalService: TerminalService, // Added TerminalService injection
  ) {}

  // --- Existing Endpoints ---

  @Get('details')
  @ApiOperation({
    summary: '获取服务器详细信息',
    description: '获取指定服务器的详细信息，包括启动时间和运行时间。',
  })
  @ApiParam({ name: 'id', description: '服务器的数字 ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '成功获取服务器详情',
    type: GetServerDetailsDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务器未找到' })
  @ApiResponse({ status: 502, description: '无法连接到服务器或执行命令失败' })
  // @Roles(Role.ADMIN, Role.USER) // Example: Specify allowed roles
  async getServerDetails(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetServerDetailsDto> {
    return this.serverInteractionService.getServerDetails(id);
  }

  @Get('resources')
  @ApiOperation({
    summary: '获取服务器资源使用情况',
    description: '获取指定服务器当前的 CPU、内存和 GPU 使用情况。',
  })
  @ApiParam({ name: 'id', description: '服务器的数字 ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '成功获取服务器资源信息',
    type: GetServerResourcesDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务器未找到' })
  @ApiResponse({ status: 502, description: '无法连接到服务器或执行命令失败' })
  // @Roles(Role.ADMIN, Role.USER)
  async getServerResources(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetServerResourcesDto> {
    return this.serverInteractionService.getServerResources(id);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK) // Set default success status to 200 OK for POST
  @ApiOperation({
    summary: '在服务器上执行命令',
    description: '在指定服务器上执行一个非交互式命令。',
  })
  @ApiParam({ name: 'id', description: '服务器的数字 ID', type: Number })
  @ApiBody({ type: ExecuteCommandDto })
  @ApiResponse({
    status: 200,
    description: '命令成功执行（无论命令本身成功或失败）',
    type: ExecuteCommandResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求体无效 (例如缺少 command)' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务器未找到' })
  @ApiResponse({
    status: 502,
    description: '无法连接到服务器、命令执行超时或执行失败',
  })
  // @Roles(Role.ADMIN) // Example: Restrict command execution to Admins
  async executeCommand(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    executeCommandDto: ExecuteCommandDto,
  ): Promise<ExecuteCommandResponseDto> {
    return this.serverInteractionService.executeCommand(id, executeCommandDto);
  }

  // --- New Terminal Endpoints ---

  @Post('terminal/session')
  @HttpCode(HttpStatus.CREATED) // Use 201 Created for resource creation
  @ApiOperation({
    summary: '创建交互式终端会话',
    description:
      '为指定服务器创建一个新的交互式 SSH 终端会话，并返回用于 WebSocket 连接的信息。',
  })
  @ApiParam({ name: 'id', description: '服务器的数字 ID', type: Number })
  @ApiResponse({
    status: 201,
    description: '成功创建终端会话',
    type: CreateTerminalSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '服务器未找到' })
  @ApiResponse({ status: 500, description: '创建会话时发生内部错误' })
  // @Roles(Role.ADMIN, Role.USER) // Adjust roles as needed
  async createTerminalSession(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CreateTerminalSessionResponseDto> {
    // The service now handles finding the server and creating the pending session
    return this.terminalService.createSession(id);
  }

  @Delete('terminal/session/:sessionId')
  @HttpCode(HttpStatus.OK) // Use 200 OK for successful deletion
  @ApiOperation({
    summary: '关闭交互式终端会话',
    description: '关闭指定的活动终端会话（包括 WebSocket 连接和 SSH PTY）。',
  })
  @ApiParam({ name: 'id', description: '服务器的数字 ID', type: Number })
  @ApiParam({
    name: 'sessionId',
    description: '要关闭的终端会话的 UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: '成功关闭会话或会话不存在',
    type: CloseTerminalSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({
    status: 404,
    description: '会话未找到 (或者说，关闭操作完成，即使它之前不存在)',
  }) // Consider 200 even if not found for idempotency
  // @Roles(Role.ADMIN, Role.USER) // Adjust roles as needed
  async closeTerminalSession(
    @Param('id', ParseIntPipe) id: number, // Server ID might be useful for authorization/logging later, though not strictly needed by terminalService.closeSession
    @Param('sessionId') sessionId: string,
  ): Promise<CloseTerminalSessionResponseDto> {
    const closed = this.terminalService.closeSession(sessionId);
    // Return success even if the session was already closed or didn't exist
    // This makes the DELETE operation idempotent.
    return {
      success: true, // Indicate the operation completed
      message: closed
        ? 'Terminal session closed successfully.'
        : 'Terminal session not found or already closed.',
    };
    // If you strictly want 404 when not found:
    // if (!closed) {
    //   throw new NotFoundException(`Terminal session with ID ${sessionId} not found.`);
    // }
    // return { success: true, message: 'Terminal session closed successfully.' };
  }
}
