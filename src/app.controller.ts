import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('health-check')
@Controller('health-check')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Check Health',
    description: 'Checks the health status of the application.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check successful.',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Health check failed.',
  })
  healthCheck() {
    return this.appService.healthCheck();
  }
}
