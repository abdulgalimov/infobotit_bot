import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  CallDB,
  CallSchemaDB,
  EntityDB,
  EntitySchemaDB,
  UserDB,
  UserSchemaDB,
} from './schemas';
import { UserManager, EntityManager, CallManager } from './managers';

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
        name: UserDB.name,
        schema: UserSchemaDB,
      },
      {
        name: EntityDB.name,
        schema: EntitySchemaDB,
      },
      {
        name: CallDB.name,
        schema: CallSchemaDB,
      },
    ]),
  ],
  providers: [UserManager, EntityManager, CallManager],
  exports: [UserManager, EntityManager, CallManager],
})
export class DatabaseModule {}
