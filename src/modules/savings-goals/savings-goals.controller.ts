import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service.js';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto.js';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto.js';
import { AddFundsDto } from './dto/add-funds.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Savings Goals')
@ApiBearerAuth()
@Controller('savings-goals')
@UseGuards(JwtAuthGuard)
export class SavingsGoalsController {
  constructor(private readonly savingsGoalsService: SavingsGoalsService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.savingsGoalsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.savingsGoalsService.findOne(id, userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateSavingsGoalDto) {
    return this.savingsGoalsService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.update(id, userId, dto);
  }

  @Patch(':id/add-funds')
  addFunds(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: AddFundsDto,
  ) {
    return this.savingsGoalsService.addFunds(id, userId, dto.amount);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.savingsGoalsService.remove(id, userId);
  }
}
