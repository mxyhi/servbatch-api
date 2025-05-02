import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: '获取系统摘要' })
  @ApiResponse({ status: 200, description: '返回系统摘要信息' })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('summary-with-proxies')
  @ApiOperation({ summary: '获取包含代理信息的系统摘要' })
  @ApiResponse({ status: 200, description: '返回包含代理信息的系统摘要' })
  getSummaryWithProxies() {
    return this.dashboardService.getSummaryWithProxies();
  }

  @Get('recent-executions')
  @ApiOperation({ summary: '获取最近的执行记录' })
  @ApiQuery({ name: 'limit', required: false, description: '返回记录数量限制' })
  @ApiResponse({ status: 200, description: '返回最近的执行记录' })
  getRecentExecutions(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.dashboardService.getRecentExecutions(limit);
  }

  @Get('server-status')
  @ApiOperation({ summary: '获取所有服务器状态' })
  @ApiResponse({ status: 200, description: '返回所有服务器状态' })
  getServerStatus() {
    return this.dashboardService.getServerStatus();
  }

  @Get('task-stats')
  @ApiOperation({ summary: '获取任务统计信息' })
  @ApiResponse({ status: 200, description: '返回任务统计信息' })
  getTaskStats() {
    return this.dashboardService.getTaskStats();
  }

  @Get('proxy-status')
  @ApiOperation({ summary: '获取所有代理状态' })
  @ApiResponse({ status: 200, description: '返回所有代理状态' })
  getProxyStatus() {
    return this.dashboardService.getProxyStatus();
  }
}
