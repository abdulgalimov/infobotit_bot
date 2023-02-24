import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    const adminUsers = this.config.get<number[]>('adminUsers');

    await this.userRepository.update(
      {},
      {
        isAdmin: false,
      },
    );

    await this.userRepository.update(
      {
        id: In(adminUsers),
      },
      {
        isAdmin: true,
      },
    );
  }

  async findById(id: number) {
    return this.userRepository.findOne({
      where: {
        id,
      },
    });
  }

  async getFrom(from: any) {
    let stat = await this.userRepository.findOne({
      where: {
        id: from.id,
      },
    });

    if (!stat) {
      stat = await this.userRepository.create();
      stat.id = from.id;
      stat.name = [from.first_name, from.last_name]
        .filter((n) => !!n)
        .join(' ');
      stat.isAdmin = false;
      stat.createdAt = new Date();

      await this.userRepository.insert(stat);
    }

    return stat;
  }
}
