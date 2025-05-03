import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import * as crypto from 'crypto';

// 简单的密码哈希函数，与seed.ts中的相同
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany();
    return users.map(({ password, ...rest }) => rest);
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
