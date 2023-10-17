import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          config: configService.getOrThrow('redis'),
          connectionName: 'temp',
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisManagerModule {}
