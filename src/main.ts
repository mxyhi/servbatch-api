import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { PaginationResultDto, PaginationParamsDto } from './common';

async function bootstrap() {
  console.log('应用启动中...', process.env.DATABASE_URL);
  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 配置Swagger
  const config = new DocumentBuilder()
    .setTitle('服务器批量管理系统')
    .setDescription('服务器批量管理、任务下发和监控API')
    .setVersion('1.0')
    .addTag('servers', '服务器管理')
    .addTag('tasks', '任务管理')
    .addTag('executions', '任务执行')
    .addTag('dashboard', '仪表盘')
    .addTag('proxies', '代理管理')
    .addTag('proxy-websocket', '[WS] 中介代理WebSocket接口')
    .addTag('auth', '认证')
    .addTag('users', '用户管理')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [PaginationResultDto, PaginationParamsDto],
  });
  SwaggerModule.setup('api-docs', app, document);

  // 启用CORS
  app.enableCors();

  // 设置全局前缀
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`应用已启动: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`API文档: http://localhost:${process.env.PORT ?? 3000}/api-docs`);
}
bootstrap();
