import {
  Injectable,
  ConflictException,
  NotFoundException,
  OnModuleInit, // 添加 OnModuleInit
  Logger, // 添加 Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 添加 ConfigService
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { PaginationResultDto, PaginationService } from '../../common';
import * as crypto from 'crypto';

// 简单的密码哈希函数，与seed.ts中的相同
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

@Injectable()
export class UsersService implements OnModuleInit {
  // 实现 OnModuleInit
  private readonly logger = new Logger(UsersService.name); // 初始化 Logger

  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
    private readonly configService: ConfigService, // 注入 ConfigService
  ) {}

  async onModuleInit() {
    this.logger.log(
      'Initializing UsersService - Checking for default admin user...',
    );
    await this.createDefaultAdminUser();
  }

  private async createDefaultAdminUser(): Promise<void> {
    try {
      const adminExists = await this.prisma.user.findFirst({
        where: { role: 'admin' },
      });

      if (!adminExists) {
        this.logger.log(
          'Default admin user not found. Attempting to create...',
        );

        const username = this.configService.get<string>('ADMIN_USERNAME');
        const password = this.configService.get<string>('ADMIN_PASSWORD');
        const email = this.configService.get<string>('ADMIN_EMAIL');

        if (!username || !password || !email) {
          this.logger.error(
            'Missing required environment variables for default admin user (ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL). Cannot create default admin.',
          );
          // 根据需要，可以选择抛出错误或仅记录日志
          // throw new Error('Missing required environment variables for default admin user.');
          return; // 如果不希望阻止应用启动，则返回
        }

        const hashedPassword = hashPassword(password);

        await this.prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            email,
            role: 'admin',
            isActive: true, // 默认激活
          },
        });

        this.logger.log(
          `Default admin user '${username}' created successfully.`,
        );
      } else {
        this.logger.log(
          'Default admin user already exists. Skipping creation.',
        );
      }
    } catch (error) {
      this.logger.error('Error during default admin user creation:', error);
      // 根据需要处理错误，例如重新抛出或记录更详细的信息
    }
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException(`用户名 ${createUserDto.username} 已存在`);
    }

    // 如果提供了电子邮件，检查是否已存在
    if (createUserDto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingEmail) {
        throw new ConflictException(`电子邮件 ${createUserDto.email} 已存在`);
      }
    }

    // 加密密码
    const hashedPassword = hashPassword(createUserDto.password);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // 返回用户信息（不包含密码）
    const { password, ...result } = user;
    return result;
  }

  async findByLimit(
    params: UserQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<UserEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.username) {
      where.username = {
        contains: params.username,
      };
    }

    if (params.email) {
      where.email = {
        contains: params.email,
      };
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    // 使用分页服务进行查询
    const result = await this.paginationService.paginateByLimit<any, any>(
      this.prisma.user,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
    );

    // 移除密码字段
    result.items = result.items.map(({ password, ...rest }) => rest);

    return result;
  }

  /**
   * 分页获取用户列表（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: UserQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<UserEntity>> {
    return this.findByLimit(params);
  }

  async findOne(id: number): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }

    const { password, ...result } = user;
    return result;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    // 检查用户是否存在
    await this.findOne(id);

    // 如果要更新密码，需要加密
    if (updateUserDto.password) {
      updateUserDto.password = hashPassword(updateUserDto.password);
    }

    // 更新用户
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    // 返回用户信息（不包含密码）
    const { password, ...result } = user;
    return result;
  }

  async remove(id: number): Promise<void> {
    // 检查用户是否存在
    await this.findOne(id);

    // 删除用户
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
