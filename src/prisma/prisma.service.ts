import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaMariaDb(process.env['DATABASE_URL'] ?? ''),
    });
  }

  async onModuleInit() {
    const synchronize = process.env['DB_SYNCHRONIZE'] === 'true';

    if (synchronize) {
      this.logger.warn('DB_SYNCHRONIZE=true — pushing schema to database...');
      try {
        execSync('npx prisma db push', {
          stdio: 'inherit',
        });
        this.logger.log('Schema synchronized successfully');
      } catch (error) {
        this.logger.error('Failed to synchronize schema', error);
      }
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
