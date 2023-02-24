import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CallDB, CallSchemaDB, EntityDB, EntitySchemaDB } from './schemas';
import { EntityManager, CallManager } from './managers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatEntity } from './entities/stat.entity';
import { StatService } from './services/stat.service';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { PgConfig } from '../config';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mongoUri = config.getOrThrow('mongoUri');
        return {
          uri: mongoUri,
          dbName: 'infobot',
          user: 'infobot',
          pass: 'infobot',
          // authSource: 'infobot',
          autoIndex: true,
        };
      },
    }),
    MongooseModule.forFeature([
      {
        name: EntityDB.name,
        schema: EntitySchemaDB,
      },
      {
        name: CallDB.name,
        schema: CallSchemaDB,
      },
    ]),
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
          entities: [StatEntity, NotificationEntity, UserEntity],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([StatEntity, NotificationEntity, UserEntity]),
  ],
  providers: [
    EntityManager,
    CallManager,
    StatService,
    NotificationService,
    UserService,
  ],
  exports: [
    EntityManager,
    CallManager,
    StatService,
    NotificationService,
    UserService,
  ],
})
export class DatabaseModule {}
