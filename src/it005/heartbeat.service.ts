import { Inject, Injectable } from '@nestjs/common';
import { It005ApiService } from './it005.api';

@Injectable()
export class HeartbeatService {
  constructor(
    @Inject(It005ApiService)
    private api: It005ApiService,
  ) {
    setInterval(() => this.ping(), 5 * 60 * 1000);
    this.ping().then();
  }

  public async ping() {
    await this.api.heartbeat();
  }
}
