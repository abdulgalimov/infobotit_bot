import { Global, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { ApiConfig } from '../config';

@Global()
@Injectable()
export class It005ApiService {
  private readonly apiConfig: ApiConfig;
  private apiToken: string;
  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.apiConfig = configService.getOrThrow('api');
  }
  async callApi(path: string, body: any) {
    if (!this.apiToken) {
      await this.login();
    }

    const url = `${this.apiConfig.url}/${path}?token=${this.apiToken}`;
    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
    };
    return fetch(url, options).then((res) => res.json());
  }

  async login() {
    const body = {
      username: this.apiConfig.username,
      password: this.apiConfig.password,
      version: this.apiConfig.version,
      port: this.apiConfig.port,
      url: this.apiConfig.callbackUrl,
    };
    const url = `${this.apiConfig.url}/login`;
    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
    };
    const result = await fetch(url, options).then((res) => res.json());
    if (result.status === 'Success') {
      this.apiToken = result.token;
    }
  }

  async getDownloadUrl(recording: string) {
    const body = {
      recording,
      allowedip: this.apiConfig.allowedIP,
    };
    const { status, random } = await this.callApi('recording/get_random', body);
    if (status !== 'Success') {
      throw new Error('Error get random');
    }

    return `${this.apiConfig.url}/recording/download?recording=${recording}&random=${random}&token=${this.apiToken}`;
  }
}
