import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from './config';
import { TelegramModule } from './telegram/telegram.module';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { It005Module } from './it005/it005.module';
import { RedisManagerModule } from './redis/redis.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
      validate: undefined,
    }),
    MonitoringModule,
    DatabaseModule,
    It005Module,
    TelegramModule,
    AuthModule,
    ApiModule,
    RedisManagerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
