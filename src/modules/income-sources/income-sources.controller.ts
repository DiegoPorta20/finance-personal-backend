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
import { IncomeSourcesService } from './income-sources.service.js';
import { CreateIncomeSourceDto } from './dto/create-income-source.dto.js';
import { UpdateIncomeSourceDto } from './dto/update-income-source.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Income Sources')
@ApiBearerAuth()
@Controller('income-sources')
@UseGuards(JwtAuthGuard)
export class IncomeSourcesController {
  constructor(private readonly incomeSourcesService: IncomeSourcesService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.incomeSourcesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.incomeSourcesService.findOne(id, userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateIncomeSourceDto) {
    return this.incomeSourcesService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateIncomeSourceDto,
  ) {
    return this.incomeSourcesService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.incomeSourcesService.remove(id, userId);
  }

  @Get('total/monthly')
  getMonthlyTotal(@CurrentUser() userId: string) {
    return this.incomeSourcesService.getMonthlyTotal(userId);
  }

  @Post('generate-due')
  generateDue(@CurrentUser() userId: string) {
    return this.incomeSourcesService.generateDue(userId);
  }
}
