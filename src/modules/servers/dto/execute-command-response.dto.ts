import { ApiProperty } from '@nestjs/swagger';

export class ExecuteCommandResponseDto {
  @ApiProperty({
    description: '命令的标准输出',
    example: 'total 0\n-rw-r--r-- 1 root root 0 May 4 12:00 file1.txt',
  })
  stdout: string;

  @ApiProperty({ description: '命令的标准错误输出', example: '' })
  stderr: string;

  @ApiProperty({ description: '命令的退出码', example: 0 })
  exitCode: number | null; // null 表示信号终止等情况

  constructor(partial: Partial<ExecuteCommandResponseDto>) {
    this.stdout = partial.stdout ?? '';
    this.stderr = partial.stderr ?? '';
    this.exitCode = partial.exitCode ?? null;
  }
}
