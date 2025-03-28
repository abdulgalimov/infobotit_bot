import { Injectable } from '@nestjs/common';
import { totalmem } from 'os';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { HealthItem } from '../types';

const memoryRSS = 'memory_RSS';
const rssThreshold = totalmem() * 0.9;

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
  ) {}

  getStatuses(): Promise<HealthItem[]> {
    return Promise.all([this.isMemoryHealthy()]);
  }

  private async isMemoryHealthy(): Promise<HealthItem> {
    const value = await this.memory
      .checkRSS(memoryRSS, rssThreshold)
      .then(() => true)
      .catch(() => true);

    return { key: memoryRSS, value };
  }

  @HealthCheck()
  public async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkRSS(memoryRSS, rssThreshold),
    ]);
  }
}
