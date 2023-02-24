import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IEntity } from '../../types';
import { OrgEntity } from '../entities/org.entity';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(OrgEntity)
    private orgRepository: Repository<OrgEntity>,
  ) {}

  async create(title: string) {
    const org = this.orgRepository.create();

    org.title = title;
    org.chatId = 0;

    await this.orgRepository.insert(org);

    return org;
  }

  async getAll() {
    return this.orgRepository.find();
  }

  async delete(id: number) {
    await this.orgRepository.delete({ id });
  }

  async findByTitle(title: string) {
    return this.orgRepository.findOne({
      where: {
        title,
      },
    });
  }

  async findById(id: number) {
    return this.orgRepository.findOne({ where: { id } });
  }

  async findAllByChat(chatId: number): Promise<IEntity[]> {
    return this.orgRepository.find({ where: { chatId } });
  }

  async updateChat(id: number, chatId: number) {
    return this.orgRepository.update(
      { id },
      {
        chatId,
      },
    );
  }
}
