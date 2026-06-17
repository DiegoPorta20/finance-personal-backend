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
import { AccountsService } from './accounts.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.accountsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.accountsService.findOne(id, userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.accountsService.remove(id, userId);
  }
}
