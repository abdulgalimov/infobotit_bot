import { Inject, Injectable } from '@nestjs/common';
import { InputRequest } from '../types';
import { CreateEntityDto } from '../types';
import { OrgService } from '../database/services/org.service';

@Injectable()
export class EntityService {
  @Inject(OrgService)
  private orgService: OrgService;

  public async create(req: InputRequest, body: CreateEntityDto) {
    const { title } = body;
    const org = await this.orgService.create(title);
    return {
      org,
    };
  }

  public async getList() {
    const entities = await this.orgService.getAll();
    return {
      entities,
    };
  }

  public async delete(id: number) {
    if (!id) {
      throw new Error('invalid id');
    }
    await this.orgService.delete(id);
    return {
      ok: true,
    };
  }
}
