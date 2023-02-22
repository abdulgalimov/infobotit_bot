import { Model } from 'mongoose';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserDB, UserDocumentDB } from '../schemas';
import { BaseManager } from './base.manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserManager
  extends BaseManager<UserDocumentDB>
  implements OnModuleInit
{
  constructor(
    @InjectModel(UserDB.name)
    private model: Model<UserDocumentDB>,
    private config: ConfigService,
  ) {
    super(model, UserDB.name);
  }

  async onModuleInit() {
    const adminUsers = this.config.get<string>('adminUsers');

    await this.model.updateMany(
      {},
      {
        $set: {
          isAdmin: false,
        },
      },
    );

    await this.model.updateMany(
      {
        id: adminUsers[0],
      },
      {
        $set: {
          isAdmin: true,
        },
      },
    );
  }

  async findById(id: number) {
    return this.model.findOne({
      where: {
        id,
      },
    });
  }

  async getFrom(from: any) {
    const userData = {
      id: from.id,
      name: [from.first_name, from.last_name].filter((n) => !!n).join(' '),
    };

    return this.model.findOneAndUpdate(
      {
        id: userData.id,
      },
      {
        $setOnInsert: userData,
      },
      {
        new: true,
        upsert: true,
      },
    );
  }
}
