import { Inject, Injectable } from '@nestjs/common';
import { InputRequest } from '../types';
import { CreateOrgDto } from '../types';
import { OrgService as OrgServiceDb } from '../database/services/org.service';

@Injectable()
export class OrgService {
  @Inject(OrgServiceDb)
  private orgService: OrgServiceDb;

  public async create(req: InputRequest, body: CreateOrgDto) {
    const { title } = body;
    const org = await this.orgService.create(title);
    return {
      org,
    };
  }

  public async getList() {
    const orgs = await this.orgService.getAll();
    return {
      orgs,
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
