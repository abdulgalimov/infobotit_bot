import { Global, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { UpdateService } from './update.service';
import { userMiddleware } from './middlewares';
import { AuthModule } from '../auth/auth.module';
import { NotificationService } from './notification.service';
import { It005Module } from '../it005/it005.module';
import { UserService } from '../database/services/user.service';
import { RedisManagerModule } from '../redis/redis.module';
import { Telegraf } from 'telegraf';
import { TelegramConfig } from '../config';

@Global()
@Module({
  imports: [
    AuthModule,
    It005Module,
    RedisManagerModule,
    TelegrafModule.forRootAsync({
      inject: [ConfigService, UserService],
      useFactory: async (config: ConfigService, userService: UserService) => {
        const telegram = config.getOrThrow<TelegramConfig>('telegram');
        const { token, webhook } = telegram;

        const launchOptions: Telegraf.LaunchOptions = {};
        launchOptions.webhook = webhook
          ? {
              domain: webhook.domain,
              hookPath: webhook.path,
            }
          : undefined;

        return {
          token,
          launchOptions,
          middlewares: [userMiddleware(userService)],
        };
      },
    }),
  ],
  providers: [UpdateService, NotificationService],
  exports: [NotificationService],
})
export class TelegramModule {}
