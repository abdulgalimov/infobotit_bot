import { Global, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { UpdateService } from './update.service';
import { userMiddleware } from './middlewares';
import { UserManager } from '../database/managers';
import { AuthModule } from '../auth/auth.module';
import { NotificationService } from './notification.service';
import { It005Module } from '../it005/it005.module';

@Global()
@Module({
  imports: [
    AuthModule,
    It005Module,
    TelegrafModule.forRootAsync({
      inject: [ConfigService, UserManager],
      useFactory: async (config: ConfigService, userManager: UserManager) => {
        const telegramToken = config.getOrThrow('telegramToken');

        return {
          token: telegramToken,
          middlewares: [userMiddleware(userManager)],
        };
      },
    }),
  ],
  providers: [UpdateService, NotificationService],
  exports: [NotificationService],
})
export class TelegramModule {}
