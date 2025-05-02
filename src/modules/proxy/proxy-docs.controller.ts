import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ProxyConnectionDto } from './dto/proxy-connection.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { CommandResultDto } from './dto/command-result.dto';
import { CommandResultReceivedDto } from './dto/command-result-received.dto';

/**
 * 代理WebSocket接口文档控制器
 * 
 * 注意：这个控制器仅用于生成API文档，不处理实际请求。
 * 实际的WebSocket接口由ProxyGateway处理。
 */
@ApiTags('proxy-websocket')
@Controller('proxy-docs')
export class ProxyDocsController {
  /**
   * WebSocket连接
   * 
   * 这是一个WebSocket接口，不是REST API。
   * 客户端需要使用Socket.IO或原生WebSocket连接到此端点。
   */
  @Get('connection')
  @ApiOperation({
    summary: 'WebSocket连接',
    description: `
      ## WebSocket连接信息
      
      这是一个WebSocket接口，不是REST API。客户端需要使用Socket.IO或原生WebSocket连接到此端点。
      
      ### 连接URL
      \`\`\`
      ws(s)://<主服务器地址>/proxy
      \`\`\`
      
      ### 连接示例（Socket.IO）
      \`\`\`javascript
      const socket = io(\`\${serverUrl}/proxy\`, {
        query: {
          proxyId: "proxy-1",
          apiKey: "your-api-key"
        }
      });
      \`\`\`
      
      ### 连接示例（原生WebSocket）
      \`\`\`javascript
      const socket = new WebSocket(\`\${serverUrl}/proxy?proxyId=proxy-1&apiKey=your-api-key\`);
      \`\`\`
    `,
  })
  @ApiBody({
    description: '连接参数（作为query参数传递）',
    type: ProxyConnectionDto,
  })
  @ApiResponse({
    status: 101,
    description: '连接成功，升级为WebSocket协议',
  })
  @ApiResponse({
    status: 401,
    description: '认证失败，连接被拒绝',
  })
  connection() {
    return { message: '这是WebSocket接口的文档，不是实际的API端点' };
  }

  /**
   * 执行命令事件
   * 
   * 主服务器发送给中介服务的命令执行请求。
   * 这是一个WebSocket事件，不是REST API。
   */
  @Get('execute-command')
  @ApiOperation({
    summary: '执行命令事件（主服务器 -> 中介服务）',
    description: `
      ## 执行命令事件
      
      这是一个WebSocket事件，不是REST API。
      
      ### 事件名称
      \`execute_command\`
      
      ### 事件方向
      主服务器 -> 中介服务
      
      ### 示例代码（Socket.IO服务端）
      \`\`\`javascript
      // 在主服务器中发送命令
      socket.emit('execute_command', {
        commandId: "cmd_1620000000000_abc123",
        serverId: 123,
        host: "192.168.1.100",
        port: 22,
        username: "root",
        password: "password123",
        command: "ls -la",
        timeout: 30000
      });
      \`\`\`
      
      ### 示例代码（Socket.IO客户端）
      \`\`\`javascript
      // 在中介服务中监听命令
      socket.on('execute_command', async (data) => {
        try {
          const result = await executeCommand(data);
          socket.emit('command_result', {
            commandId: data.commandId,
            result: result
          });
        } catch (error) {
          socket.emit('command_result', {
            commandId: data.commandId,
            result: {
              stdout: '',
              stderr: error.message,
              exitCode: 1
            }
          });
        }
      });
      \`\`\`
    `,
  })
  @ApiBody({
    description: '命令执行请求',
    type: ExecuteCommandDto,
  })
  executeCommand() {
    return { message: '这是WebSocket事件的文档，不是实际的API端点' };
  }

  /**
   * 命令结果事件
   * 
   * 中介服务发送给主服务器的命令执行结果。
   * 这是一个WebSocket事件，不是REST API。
   */
  @Get('command-result')
  @ApiOperation({
    summary: '命令结果事件（中介服务 -> 主服务器）',
    description: `
      ## 命令结果事件
      
      这是一个WebSocket事件，不是REST API。
      
      ### 事件名称
      \`command_result\`
      
      ### 事件方向
      中介服务 -> 主服务器
      
      ### 示例代码（Socket.IO客户端）
      \`\`\`javascript
      // 在中介服务中发送结果
      socket.emit('command_result', {
        commandId: "cmd_1620000000000_abc123",
        result: {
          stdout: "total 20\\ndrwxr-xr-x 4 root root 4096 May 10 12:34 .",
          stderr: "",
          exitCode: 0
        }
      });
      \`\`\`
      
      ### 示例代码（Socket.IO服务端）
      \`\`\`javascript
      // 在主服务器中监听结果
      socket.on('command_result', (data) => {
        // 处理命令执行结果
        console.log(\`收到命令 \${data.commandId} 的执行结果\`);
        console.log(\`标准输出: \${data.result.stdout}\`);
        console.log(\`错误输出: \${data.result.stderr}\`);
        console.log(\`退出码: \${data.result.exitCode}\`);
        
        // 发送确认
        socket.emit('command_result_received', { success: true });
      });
      \`\`\`
    `,
  })
  @ApiBody({
    description: '命令执行结果',
    type: CommandResultDto,
  })
  @ApiResponse({
    status: 200,
    description: '命令结果接收确认',
    schema: {
      $ref: getSchemaPath(CommandResultReceivedDto),
    },
  })
  commandResult() {
    return { message: '这是WebSocket事件的文档，不是实际的API端点' };
  }

  /**
   * 错误处理
   * 
   * 中介服务的错误处理机制说明。
   */
  @Get('error-handling')
  @ApiOperation({
    summary: '错误处理',
    description: `
      ## 错误处理
      
      ### 连接错误
      
      当连接失败时，中介服务应当实现重连机制，默认重连间隔为5秒，最大重连次数为无限。
      
      ### 命令执行错误
      
      当命令执行失败时，中介服务应当返回以下格式的错误响应：
      
      \`\`\`json
      {
        "commandId": "cmd_1620000000000_abc123",
        "result": {
          "stdout": "",
          "stderr": "错误信息",
          "exitCode": 1
        }
      }
      \`\`\`
      
      ### 安全要求
      
      1. 所有通信应当使用WSS（WebSocket Secure）进行加密
      2. API密钥应当足够复杂（至少32个字符）
      3. 敏感信息（如密码和私钥）不应当被记录到日志中
      4. 考虑实现IP白名单，限制可连接的客户端
    `,
  })
  errorHandling() {
    return { message: '这是WebSocket接口的文档，不是实际的API端点' };
  }
}
