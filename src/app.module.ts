import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from './config';
import { TelegramModule } from './telegram/telegram.module';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { It005Module } from './it005/it005.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
      validate: undefined,
    }),
    DatabaseModule,
    It005Module,
    TelegramModule,
    AuthModule,
    ApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
