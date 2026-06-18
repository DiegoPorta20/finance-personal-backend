import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { IncomeSourcesModule } from './modules/income-sources/income-sources.module.js';
import { BudgetsModule } from './modules/budgets/budgets.module.js';
import { SavingsGoalsModule } from './modules/savings-goals/savings-goals.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    AnalyticsModule,
    IncomeSourcesModule,
    BudgetsModule,
    SavingsGoalsModule,
    NotificationsModule,
    RecommendationsModule,
    UsersModule,
  ],
})
export class AppModule {}
