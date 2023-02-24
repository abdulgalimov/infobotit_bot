import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './services/notification.service';
import { PgConfig } from '../config';
import { UserService } from './services/user.service';
import { OrgService } from './services/org.service';
import { CdrService } from './services/cdr.service';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from './entities/user.entity';
import { OrgEntity } from './entities/org.entity';
import { CdrEntity } from './entities/cdr.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const pgConfig: PgConfig = configService.getOrThrow('pg');

        return {
          type: 'postgres',
          host: pgConfig.host,
          port: pgConfig.port,
          username: 'infobot',
          password: 'infobot',
          database: 'infobot',
          entities: [NotificationEntity, UserEntity, OrgEntity, CdrEntity],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([
      NotificationEntity,
      UserEntity,
      OrgEntity,
      CdrEntity,
    ]),
  ],
  providers: [NotificationService, UserService, OrgService, CdrService],
  exports: [NotificationService, UserService, OrgService, CdrService],
})
export class DatabaseModule {}
