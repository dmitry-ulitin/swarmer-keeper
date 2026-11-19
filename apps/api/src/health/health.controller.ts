import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthDto } from './health.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ operationId: 'getHealth' })
  @ApiOkResponse({ type: HealthDto })
  getHealth(): HealthDto {
    return { status: 'ok' };
  }
}
