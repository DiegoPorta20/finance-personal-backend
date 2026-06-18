import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const synchronize = process.env['DB_SYNCHRONIZE'] === 'true';

    if (synchronize) {
      this.logger.warn('DB_SYNCHRONIZE=true — pushing schema to database...');
      try {
        execSync('npx prisma db push --skip-generate', {
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
