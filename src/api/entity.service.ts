import { Inject, Injectable } from '@nestjs/common';
import { InputRequest } from '../types';
import { EntityManager } from '../database/managers/entity.manager';
import { CreateEntityDto } from '../types/dto';

@Injectable()
export class EntityService {
  @Inject(EntityManager)
  private entityManager: EntityManager;

  public async create(req: InputRequest, body: CreateEntityDto) {
    const { title } = body;
    const entity = await this.entityManager.create(title);
    return {
      entity,
    };
  }

  public async getList() {
    const entities = await this.entityManager.getAll();
    return {
      entities,
    };
  }

  public async delete(id: number) {
    if (!id) {
      throw new Error('invalid id');
    }
    await this.entityManager.delete(id);
    return {
      ok: true,
    };
  }
}
