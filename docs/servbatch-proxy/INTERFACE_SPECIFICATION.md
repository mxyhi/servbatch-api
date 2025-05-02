# 中介服务接口规范文档

## 概述

本文档定义了服务器批量管理系统中介服务的接口规范。中介服务是一个运行在内网环境中的组件，用于连接公网主服务器与内网服务器，实现公网服务器对内网服务器的管理和命令执行。

中介服务通过WebSocket与主服务器建立双向通信通道，接收命令执行请求并返回执行结果。这种架构允许公网服务器间接管理内网服务器，而无需内网服务器开放公网访问。

## 通信协议

### 基本信息

- **协议**: WebSocket (Socket.IO)
- **命名空间**: `/proxy`
- **主服务器URL**: `http(s)://<主服务器地址>/proxy`

### 认证

中介服务在连接到主服务器时需要提供以下认证信息：

```javascript
{
  query: {
    proxyId: "<唯一的代理ID>",
    apiKey: "<API密钥>"
  }
}
```

- `proxyId`: 中介服务的唯一标识符，用于区分不同的中介服务
- `apiKey`: 用于验证中介服务身份的密钥，必须与主服务器配置的密钥匹配

### 事件定义

#### 主服务器发送的事件

1. **execute_command**

   主服务器发送命令执行请求。

   ```javascript
   {
     commandId: "cmd_<时间戳>_<随机字符串>",  // 命令的唯一ID
     serverId: 123,                         // 服务器ID
     host: "192.168.1.100",                // 服务器主机地址
     port: 22,                             // SSH端口
     username: "root",                     // 用户名
     password: "password123",              // 密码（如果使用密码认证）
     privateKey: "-----BEGIN...",          // 私钥（如果使用密钥认证）
     command: "ls -la",                    // 要执行的命令
     timeout: 30000                        // 超时时间（毫秒）
   }
   ```

#### 中介服务发送的事件

1. **command_result**

   中介服务发送命令执行结果。

   ```javascript
   {
     commandId: "cmd_<时间戳>_<随机字符串>",  // 与请求中的commandId相同
     result: {
       stdout: "命令的标准输出",
       stderr: "命令的错误输出",
       exitCode: 0                         // 命令的退出码，0表示成功
     }
   }
   ```

#### 主服务器响应的事件

1. **command_result_received**

   主服务器确认收到命令执行结果。

   ```javascript
   {
     success: true  // 表示结果已成功接收
   }
   ```

## 错误处理

中介服务应当处理以下错误情况：

1. **连接错误**
   - 无法连接到主服务器
   - 认证失败
   - 连接中断

2. **命令执行错误**
   - 无法连接到目标服务器
   - 命令执行超时
   - 命令执行失败

对于所有错误，中介服务应当：
- 记录详细的错误信息
- 尝试重新连接（如果是连接错误）
- 返回适当的错误响应（如果是命令执行错误）

## 实现要求

### 必须实现的功能

1. **连接管理**
   - 连接到主服务器的WebSocket服务
   - 断线重连机制
   - 认证机制

2. **命令执行**
   - 接收并解析命令执行请求
   - 通过SSH连接到目标服务器
   - 执行命令并捕获输出
   - 返回命令执行结果

3. **连接池管理**
   - 维护SSH连接池，避免频繁建立连接
   - 定期检查连接有效性
   - 优雅关闭连接

4. **安全措施**
   - 验证API密钥
   - 安全存储敏感信息
   - 处理超时和错误

### 可选功能

1. **日志记录**
   - 详细记录连接和命令执行情况
   - 支持不同级别的日志

2. **指标收集**
   - 收集性能和使用指标
   - 支持监控和告警

3. **多代理支持**
   - 支持多个代理实例协同工作
   - 负载均衡和故障转移

## 示例实现

以下是不同语言的示例实现框架：

### Node.js

```javascript
const { io } = require('socket.io-client');
const { NodeSSH } = require('node-ssh');
const dotenv = require('dotenv');

// 加载配置
dotenv.config();
const config = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  proxyId: process.env.PROXY_ID || 'proxy-1',
  apiKey: process.env.API_KEY || 'your-api-key',
};

// SSH连接池
const sshConnections = new Map();

// 连接到主服务器
const socket = io(`${config.serverUrl}/proxy`, {
  query: {
    proxyId: config.proxyId,
    apiKey: config.apiKey,
  },
  reconnection: true,
});

// 处理命令执行请求
socket.on('execute_command', async (data) => {
  try {
    const result = await executeCommand(data);
    socket.emit('command_result', {
      commandId: data.commandId,
      result,
    });
  } catch (error) {
    socket.emit('command_result', {
      commandId: data.commandId,
      result: {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
      },
    });
  }
});

// 执行SSH命令
async function executeCommand(data) {
  // 实现SSH连接和命令执行
  // ...
}
```

### Python

```python
import os
import json
import time
import random
import asyncio
import paramiko
import socketio
from dotenv import load_dotenv

# 加载配置
load_dotenv()
config = {
    'server_url': os.getenv('SERVER_URL', 'http://localhost:3000'),
    'proxy_id': os.getenv('PROXY_ID', 'proxy-1'),
    'api_key': os.getenv('API_KEY', 'your-api-key'),
}

# SSH连接池
ssh_connections = {}

# 创建Socket.IO客户端
sio = socketio.AsyncClient()

@sio.event
async def connect():
    print('已连接到服务器')

@sio.event
async def disconnect():
    print('与服务器断开连接')

@sio.on('execute_command')
async def on_execute_command(data):
    try:
        result = await execute_command(data)
        await sio.emit('command_result', {
            'commandId': data['commandId'],
            'result': result
        })
    except Exception as e:
        await sio.emit('command_result', {
            'commandId': data['commandId'],
            'result': {
                'stdout': '',
                'stderr': str(e),
                'exitCode': 1
            }
        })

async def execute_command(data):
    # 实现SSH连接和命令执行
    # ...
    pass

async def main():
    # 连接到主服务器
    await sio.connect(
        f"{config['server_url']}/proxy", 
        auth={
            'proxyId': config['proxy_id'],
            'apiKey': config['api_key']
        }
    )
    await sio.wait()

if __name__ == '__main__':
    asyncio.run(main())
```

### Go

```go
package main

import (
    "log"
    "os"
    "time"

    "github.com/joho/godotenv"
    socketio "github.com/googollee/go-socket.io"
    "golang.org/x/crypto/ssh"
)

// 配置
type Config struct {
    ServerURL string
    ProxyID   string
    APIKey    string
}

// SSH连接池
var sshConnections = make(map[int]*ssh.Client)

func main() {
    // 加载配置
    godotenv.Load()
    config := Config{
        ServerURL: getEnv("SERVER_URL", "http://localhost:3000"),
        ProxyID:   getEnv("PROXY_ID", "proxy-1"),
        APIKey:    getEnv("API_KEY", "your-api-key"),
    }

    // 连接到主服务器
    client, err := socketio.NewClient(config.ServerURL, socketio.DefaultDialer)
    if err != nil {
        log.Fatal(err)
    }

    // 添加认证信息
    client.Query().Set("proxyId", config.ProxyID)
    client.Query().Set("apiKey", config.APIKey)

    // 处理命令执行请求
    client.On("execute_command", func(data map[string]interface{}) {
        result, err := executeCommand(data)
        if err != nil {
            client.Emit("command_result", map[string]interface{}{
                "commandId": data["commandId"],
                "result": map[string]interface{}{
                    "stdout":   "",
                    "stderr":   err.Error(),
                    "exitCode": 1,
                },
            })
            return
        }

        client.Emit("command_result", map[string]interface{}{
            "commandId": data["commandId"],
            "result":    result,
        })
    })

    // 连接事件
    client.On("connect", func() {
        log.Println("已连接到服务器")
    })

    client.On("disconnect", func() {
        log.Println("与服务器断开连接")
    })

    // 启动客户端
    client.Connect()
    select {}
}

func executeCommand(data map[string]interface{}) (map[string]interface{}, error) {
    // 实现SSH连接和命令执行
    // ...
    return nil, nil
}

func getEnv(key, fallback string) string {
    if value, ok := os.LookupEnv(key); ok {
        return value
    }
    return fallback
}
```

## 安全最佳实践

1. **API密钥管理**
   - 使用足够长且复杂的API密钥
   - 定期轮换API密钥
   - 不要在代码中硬编码API密钥

2. **敏感信息处理**
   - 不要记录完整的密码和私钥
   - 考虑使用环境变量或安全的密钥管理服务
   - 在内存中安全地处理敏感信息

3. **通信安全**
   - 使用HTTPS/WSS进行安全通信
   - 考虑实现额外的加密层
   - 限制可连接的IP地址

4. **错误处理**
   - 不要在错误消息中暴露敏感信息
   - 实现适当的重试机制
   - 记录详细的错误日志，但不包含敏感信息

## 部署建议

1. **环境要求**
   - 运行在内网环境中
   - 能够访问主服务器
   - 能够访问内网服务器

2. **配置管理**
   - 使用环境变量或配置文件
   - 不同环境使用不同的配置
   - 敏感配置与代码分离

3. **监控和日志**
   - 实现详细的日志记录
   - 设置监控和告警
   - 定期检查日志和性能

4. **高可用性**
   - 考虑部署多个中介服务实例
   - 实现自动重启机制
   - 监控服务健康状态

## 测试方法

1. **单元测试**
   - 测试SSH连接和命令执行
   - 测试WebSocket通信
   - 测试错误处理

2. **集成测试**
   - 测试与主服务器的通信
   - 测试完整的命令执行流程
   - 测试断线重连机制

3. **性能测试**
   - 测试并发命令执行
   - 测试长时间运行的稳定性
   - 测试资源使用情况

## 故障排除

1. **连接问题**
   - 检查网络连接
   - 验证API密钥
   - 检查主服务器状态

2. **命令执行问题**
   - 检查SSH连接
   - 验证命令格式
   - 检查目标服务器权限

3. **性能问题**
   - 检查资源使用情况
   - 优化连接池管理
   - 考虑增加资源或分布式部署

## 版本兼容性

本规范适用于服务器批量管理系统v1.0及以上版本。未来版本可能会添加新的功能和事件，但会保持向后兼容性。

## 结语

本文档定义了中介服务的接口规范，任何符合此规范的实现都可以与服务器批量管理系统无缝集成。开发者可以根据自己的需求和技术栈选择合适的实现方式。

如有任何问题或建议，请联系系统管理员或开发团队。
