import { ApiProperty } from '@nestjs/swagger';

export class CleanupResultDto {
  @ApiProperty({ description: '已删除的记录数量' })
  deletedCount: number;

  @ApiProperty({ description: '清理操作是否成功' })
  success: boolean;

  @ApiProperty({ description: '清理操作的消息', required: false })
  message?: string;
}
