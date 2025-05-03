# Docker 部署指南

本文档提供了使用 Docker 和 Docker Compose 部署服务器批量管理系统的指南。

## 前提条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

## 快速开始

1. 克隆仓库：

```bash
git clone <仓库地址>
cd servbatch-api
```

2. 创建环境配置文件：

```bash
cp .env.example .env
```

3. 编辑 `.env` 文件，设置适当的环境变量：

```
# 应用配置
PORT=3000
NODE_ENV=production

# 数据库配置
DATABASE_URL=file:./data/servbatch.db

# 代理API密钥（请修改为强密钥）
PROXY_API_KEY=your-secure-api-key
```

4. 创建数据目录：

```bash
mkdir -p data
```

5. 构建并启动容器：

```bash
docker-compose up -d
```

6. 初始化数据库（首次运行时）：

```bash
docker-compose exec api pnpm prisma:migrate:deploy
```

现在，应用应该已经在 http://localhost:3000 上运行，API文档可以在 http://localhost:3000/api-docs 访问。

## 常用命令

- 启动服务：`docker-compose up -d`
- 停止服务：`docker-compose down`
- 查看日志：`docker-compose logs -f api`
- 重启服务：`docker-compose restart api`
- 进入容器：`docker-compose exec api sh`

## 数据持久化

数据存储在主机的 `./data` 目录中，这个目录被挂载到容器的 `/app/data` 目录。

## 更新应用

要更新应用到最新版本，请执行以下步骤：

1. 拉取最新代码：

```bash
git pull
```

2. 重新构建并启动容器：

```bash
docker-compose up -d --build
```

3. 如果有数据库迁移，应用迁移：

```bash
docker-compose exec api pnpm prisma:migrate:deploy
```

## 故障排除

### 容器无法启动

检查日志以获取详细信息：

```bash
docker-compose logs api
```

### 数据库连接问题

确保 `DATABASE_URL` 环境变量正确设置，并且数据目录具有适当的权限：

```bash
chmod -R 777 data
```

### 端口冲突

如果端口 3000 已被占用，可以在 `docker-compose.yml` 文件中修改端口映射：

```yaml
ports:
  - "3001:3000"  # 将主机的 3001 端口映射到容器的 3000 端口
```

## 安全注意事项

- 在生产环境中，请确保使用强密码和API密钥
- 考虑使用反向代理（如Nginx）并启用HTTPS
- 限制对Docker API的访问
- 定期更新Docker镜像和依赖项
