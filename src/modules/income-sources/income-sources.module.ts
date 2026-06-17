import { Module } from '@nestjs/common';
import { IncomeSourcesController } from './income-sources.controller.js';
import { IncomeSourcesService } from './income-sources.service.js';

@Module({
  controllers: [IncomeSourcesController],
  providers: [IncomeSourcesService],
  exports: [IncomeSourcesService],
})
export class IncomeSourcesModule {}
