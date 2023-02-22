import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EntityDB, EntityDocumentDB } from '../schemas';
import { BaseManager } from './base.manager';
import { IEntity } from '../../types';

@Injectable()
export class EntityManager extends BaseManager<EntityDocumentDB> {
  constructor(
    @InjectModel(EntityDB.name)
    private model: Model<EntityDocumentDB>,
  ) {
    super(model, EntityDB.name);
  }

  async create(title: string): Promise<EntityDB> {
    return this.model.create({
      id: await this.getNextSequence(),
      title,
    });
  }

  async getAll() {
    return this.model.find().exec();
  }

  async delete(id: number) {
    return this.model.deleteOne({ id });
  }

  async findByTitle(title: string) {
    return this.model.findOne({
      title,
    });
  }

  async findById(id: number) {
    return this.model.findOne({ id });
  }

  async findAllByChat(chatId: number): Promise<IEntity[]> {
    return this.model.find({ 'chat.id': chatId }).exec();
  }
}
