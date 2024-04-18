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
  loadFromFile: string;
  newServer: boolean;
}

export interface PgConfig {
  host: string;
  port: number;
}

export interface RedisConfig {
  db?: number;
  host: string;
  port: number;
}

export interface SentryConfig {
  dsnUrl: string;
  environment: string;
}

export interface MonitoringConfig {
  port: number;
}

export interface TelegramConfig {
  token: string;
  webhook?: {
    domain: string;
    path: string;
  };
}

export interface Config {
  telegram: TelegramConfig;
  mongoUri: string;
  jwtSecret: string;
  adminUsers: number[];
  api: ApiConfig;
  pg: PgConfig;
  debug: DebugConfig;
  port: number;
  redis: RedisConfig;
  sentry: SentryConfig;
  monitoring: MonitoringConfig;

  redirects: Record<string, string>;
}
