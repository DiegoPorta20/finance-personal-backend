import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query('type') type?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.transactionsService.findAll(userId, { type, accountId });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.transactionsService.remove(id, userId);
  }
}
