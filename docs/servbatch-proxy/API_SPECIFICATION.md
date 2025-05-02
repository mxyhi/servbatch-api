# 中介服务API规范

## 概述

本文档提供了中介服务API的技术规范，用于实现公网服务器与内网服务器之间的通信。

## WebSocket连接

### 连接URL

```
ws(s)://<主服务器地址>/proxy
```

### 连接参数

| 参数 | 类型 | 描述 | 必填 |
|------|------|------|------|
| proxyId | string | 中介服务的唯一标识符 | 是 |
| apiKey | string | 用于验证中介服务身份的密钥 | 是 |

### 连接示例

```javascript
// Socket.IO
const socket = io(`${serverUrl}/proxy`, {
  query: {
    proxyId: "proxy-1",
    apiKey: "your-api-key"
  }
});

// 原生WebSocket
const socket = new WebSocket(`${serverUrl}/proxy?proxyId=proxy-1&apiKey=your-api-key`);
```

## 事件

### 主服务器 -> 中介服务

#### execute_command

执行命令请求。

**参数:**

| 字段 | 类型 | 描述 | 必填 |
|------|------|------|------|
| commandId | string | 命令的唯一ID | 是 |
| serverId | number | 服务器ID | 是 |
| host | string | 服务器主机地址 | 是 |
| port | number | SSH端口 | 是 |
| username | string | 用户名 | 是 |
| password | string | 密码 | 否 |
| privateKey | string | 私钥 | 否 |
| command | string | 要执行的命令 | 是 |
| timeout | number | 超时时间（毫秒） | 否 |

**注意:** `password` 和 `privateKey` 至少需要提供一个。

**示例:**

```json
{
  "commandId": "cmd_1620000000000_abc123",
  "serverId": 123,
  "host": "192.168.1.100",
  "port": 22,
  "username": "root",
  "password": "password123",
  "command": "ls -la",
  "timeout": 30000
}
```

### 中介服务 -> 主服务器

#### command_result

命令执行结果。

**参数:**

| 字段 | 类型 | 描述 | 必填 |
|------|------|------|------|
| commandId | string | 与请求中的commandId相同 | 是 |
| result | object | 命令执行结果 | 是 |
| result.stdout | string | 命令的标准输出 | 是 |
| result.stderr | string | 命令的错误输出 | 是 |
| result.exitCode | number | 命令的退出码，0表示成功 | 是 |

**示例:**

```json
{
  "commandId": "cmd_1620000000000_abc123",
  "result": {
    "stdout": "total 20\ndrwxr-xr-x  3 root root 4096 May 3 12:00 .\ndrwxr-xr-x 22 root root 4096 May 3 11:00 ..\n-rw-r--r--  1 root root  123 May 3 12:00 file.txt",
    "stderr": "",
    "exitCode": 0
  }
}
```

### 主服务器 -> 中介服务（响应）

#### command_result_received

确认收到命令执行结果。

**参数:**

| 字段 | 类型 | 描述 | 必填 |
|------|------|------|------|
| success | boolean | 表示结果已成功接收 | 是 |

**示例:**

```json
{
  "success": true
}
```

## 错误处理

### 连接错误

当连接失败时，中介服务应当实现重连机制，默认重连间隔为5秒，最大重连次数为无限。

### 命令执行错误

当命令执行失败时，中介服务应当返回以下格式的错误响应：

```json
{
  "commandId": "cmd_1620000000000_abc123",
  "result": {
    "stdout": "",
    "stderr": "错误信息",
    "exitCode": 1
  }
}
```

## 安全要求

1. 所有通信应当使用WSS（WebSocket Secure）进行加密
2. API密钥应当足够复杂（至少32个字符）
3. 敏感信息（如密码和私钥）不应当被记录到日志中
4. 考虑实现IP白名单，限制可连接的客户端

## 性能考虑

1. 中介服务应当维护SSH连接池，避免频繁建立连接
2. 考虑实现命令执行的并发限制，避免资源耗尽
3. 定期清理长时间未使用的SSH连接
4. 实现超时机制，避免命令执行时间过长

## 实现示例

### 命令执行函数（Node.js）

```javascript
async function executeCommand(data) {
  const { serverId, host, port, username, password, privateKey, command, timeout } = data;
  
  // 获取或创建SSH连接
  let ssh = sshConnections.get(serverId);
  if (!ssh) {
    ssh = new NodeSSH();
    
    // 创建SSH配置
    const config = {
      host,
      port,
      username,
    };
    
    // 设置认证方式
    if (password) {
      config.password = password;
    } else if (privateKey) {
      config.privateKey = privateKey;
    } else {
      throw new Error('未提供密码或私钥');
    }
    
    // 连接到服务器
    await ssh.connect(config);
    sshConnections.set(serverId, ssh);
  }
  
  // 执行命令
  const options = { cwd: '/' };
  
  // 处理超时
  if (timeout) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`命令执行超时 (${timeout}ms)`)), timeout);
    });
    
    const executePromise = ssh.execCommand(command, options);
    const result = await Promise.race([executePromise, timeoutPromise]);
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code || 0,
    };
  } else {
    const result = await ssh.execCommand(command, options);
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code || 0,
    };
  }
}
```

## 版本历史

| 版本 | 日期 | 描述 |
|------|------|------|
| 1.0 | 2025-05-02 | 初始版本 |

## 联系方式

如有任何问题或建议，请联系系统管理员或开发团队。
