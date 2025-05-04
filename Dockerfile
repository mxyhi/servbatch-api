FROM node:22-alpine AS builder

# 安装pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# 复制package.json和pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN pnpm prisma:generate

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:22-alpine AS base

# 安装pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制package.json和pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./


# 只安装生产依赖
RUN pnpm install --prod

# 从构建阶段复制构建产物和Prisma相关文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 安装和生成Prisma客户端
RUN pnpm prisma:generate

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动命令
CMD ["node", "dist/main.js"]
