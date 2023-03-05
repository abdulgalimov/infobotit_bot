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
import { CustomerEntity } from './entities/customer.entity';
import { CustomerService } from './services/customer.service';
import { CallEntity } from './entities/call.entity';
import { CallService } from './services/call.service';

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
            NotificationEntity,
            UserEntity,
            OrgEntity,
            CdrEntity,
            CustomerEntity,
            CallEntity,
          ],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([
      NotificationEntity,
      UserEntity,
      OrgEntity,
      CdrEntity,
      CustomerEntity,
      CallEntity,
    ]),
  ],
  providers: [
    NotificationService,
    UserService,
    OrgService,
    CdrService,
    CustomerService,
    CallService,
  ],
  exports: [
    NotificationService,
    UserService,
    OrgService,
    CdrService,
    CustomerService,
    CallService,
  ],
})
export class DatabaseModule {}
