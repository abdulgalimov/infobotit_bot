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
  async callApi(path: string, body: any, withToken: boolean) {
    if (withToken && !this.apiToken) {
      await this.login();
    }

    let url = `${this.apiConfig.url}/${path}`;
    if (withToken) {
      url = `${url}?token=${this.apiToken}`;
    }
    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
    };
    console.log(`[api] call ${path}`);
    console.log(`body: ${JSON.stringify(body, null, 2)}`);
    return fetch(url, options)
      .then((res) => res.json())
      .then((result) => {
        console.log(`result: ${JSON.stringify(result, null, 2)}`);
        return result;
      });
  }

  async login() {
    const body = {
      username: this.apiConfig.username,
      password: this.apiConfig.password,
      version: this.apiConfig.version,
      port: this.apiConfig.port,
      url: this.apiConfig.callbackUrl,
    };
    const result = await this.callApi('login', body, false);
    if (result.status === 'Success') {
      this.apiToken = result.token;
    }
  }

  async getDownloadUrl(recording: string) {
    const body = {
      recording,
      allowedip: this.apiConfig.allowedIP,
    };
    const { status, random } = await this.callApi(
      'recording/get_random',
      body,
      true,
    );
    if (status !== 'Success') {
      throw new Error('Error get random');
    }

    return `${this.apiConfig.url}/recording/download?recording=${recording}&random=${random}&token=${this.apiToken}`;
  }

  async heartbeat() {
    const key = '2941ff0669660a340d2bae507afd77e9';
    const path = `heartbeat?${key}=${key}`;
    const body = {
      ipaddr: '88.99.216.12',
    };
    return this.callApi(path, body, true);
  }
}
