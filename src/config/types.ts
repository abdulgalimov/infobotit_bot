export interface ApiConfig {
  url: string;
  username: string;
  password: string;
  version: string;
  port: string;
  callbackUrl: string;
  allowedIP: string;
}

export interface Config {
  telegramToken: string;
  mongoUri: string;
  jwtSecret: string;
  adminUsers: number[];
  api: ApiConfig;
}
