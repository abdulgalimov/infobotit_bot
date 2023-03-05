export interface ApiConfig {
  url: string;
  username: string;
  password: string;
  version: string;
  port: string;
  callbackUrl: string;
  allowedIP: string;
}

export interface DebugConfig {
  debugMode: boolean;
  loadFromFile: boolean;
}

export interface PgConfig {
  host: string;
  port: number;
}

export interface Config {
  telegramToken: string;
  mongoUri: string;
  jwtSecret: string;
  adminUsers: number[];
  api: ApiConfig;
  pg: PgConfig;
  debug: DebugConfig;
  port: number;
}
