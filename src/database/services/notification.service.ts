import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationsRepository: Repository<NotificationEntity>,
  ) {}

  async create(
    entityId: number,
    phone: string,
    chatId: number,
    messageId: number,
  ) {
    const notification = this.notificationsRepository.create();
    notification.entityId = entityId;
    notification.phone = phone;
    notification.chatId = chatId;
    notification.messageId = messageId;

    await this.notificationsRepository.insert(notification);
  }

  async findAll(phone: string, chatId: number) {
    return this.notificationsRepository.find({
      where: {
        phone,
        chatId,
      },
    });
  }

  async delete(id: number) {
    await this.notificationsRepository.delete({
      id,
    });
  }
}
