import { PartialType } from '@nestjs/swagger';
import { CreateCommandMonitorDto } from './create-command-monitor.dto';

export class UpdateCommandMonitorDto extends PartialType(CreateCommandMonitorDto) {}
