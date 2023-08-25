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

@Global()
@Module({
  imports: [
    AuthModule,
    It005Module,
    RedisManagerModule,
    TelegrafModule.forRootAsync({
      inject: [ConfigService, UserService],
      useFactory: async (config: ConfigService, userService: UserService) => {
        const telegramToken = config.getOrThrow('telegramToken');
        const { webUrl } = config.getOrThrow('web');

        return {
          token: telegramToken,
          middlewares: [userMiddleware(userService)],
          launchOptions: {
            webhook: {
              domain: webUrl,
              hookPath: '/tg-update',
            },
          },
        };
      },
    }),
  ],
  providers: [UpdateService, NotificationService],
  exports: [NotificationService],
})
export class TelegramModule {}
