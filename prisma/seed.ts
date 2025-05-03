import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// 简单的密码哈希函数，用于替代bcrypt
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  // 检查是否已存在管理员用户
  const adminExists = await prisma.user.findFirst({
    where: {
      role: 'admin',
    },
  });

  // 如果不存在管理员用户，则创建一个
  if (!adminExists) {
    const hashedPassword = hashPassword('admin123');

    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    console.log('默认管理员用户已创建');
  } else {
    console.log('管理员用户已存在，跳过创建');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
