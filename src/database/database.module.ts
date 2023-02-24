import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatEntity } from './entities/stat.entity';
import { StatService } from './services/stat.service';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { PgConfig } from '../config';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';
import { OrgEntity } from './entities/org.entity';
import { OrgService } from './services/org.service';
import { CdrEntity } from './entities/cdr.entity';
import { CdrService } from './services/cdr.service';

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
          entities: [
            StatEntity,
            NotificationEntity,
            UserEntity,
            OrgEntity,
            CdrEntity,
          ],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([
      StatEntity,
      NotificationEntity,
      UserEntity,
      OrgEntity,
      CdrEntity,
    ]),
  ],
  providers: [
    StatService,
    NotificationService,
    UserService,
    OrgService,
    CdrService,
  ],
  exports: [
    StatService,
    NotificationService,
    UserService,
    OrgService,
    CdrService,
  ],
})
export class DatabaseModule {}
