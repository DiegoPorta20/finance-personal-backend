import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller.js';
import { BudgetsService } from './budgets.service.js';
import { IncomeSourcesModule } from '../income-sources/income-sources.module.js';

@Module({
  imports: [IncomeSourcesModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
