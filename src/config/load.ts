import * as dotenv from 'dotenv';
import * as process from 'process';
import { ApiConfig, Config, DebugConfig, PgConfig } from './types';

function loadEnv() {
  const isTesting = process.env.TS_JEST === '1';
  let filename;
  if (isTesting) {
    filename = '.test.env';
  } else if (process.env.IN_DOCKER === 'true') {
    filename = '.docker.env';
  } else {
    filename = '.run.env';
  }
  const { parsed } = dotenv.config({
    path: filename,
  });
  if (!parsed) {
    throw new Error('invalid env parsed');
  }

  return {
    ...parsed,
    isTesting,
  };
}
const env = loadEnv();

function loadAdminUsers(): number[] {
  if (!env['ADMIN_USERS']) return [];
  return env['ADMIN_USERS']
    .split(',')
    .map((item) => +item)
    .filter((id) => !!id);
}

function loadApiConfig(): ApiConfig {
  return {
    url: env['API_URL'],
    username: env['API_USERNAME'],
    password: env['API_PASSWORD'],
    version: env['API_VERSION'],
    port: env['API_PORT'],
    callbackUrl: env['API_CALLBACK_URL'],
    allowedIP: env['API_ALLOWED_IP'],
  };
}

function loadPgConfig(): PgConfig {
  return {
    host: env['PG_HOST'],
    port: env['PG_PORT'],
  };
}

function loadDebugConfig(): DebugConfig {
  return {
    debugMode: env['DEBUG_MODE'] === 'true',
    loadFromFile: env['DEBUG_LOAD_FROM_FILE'] === 'true',
  };
}

export function loadConfig(): Config {
  return {
    telegramToken: env['TELEGRAM_TOKEN'],
    mongoUri: env['MONGO_URI'],
    jwtSecret: env['JWT_SECRET'],
    adminUsers: loadAdminUsers(),
    api: loadApiConfig(),
    pg: loadPgConfig(),
    debug: loadDebugConfig(),
    port: +env['PORT'],
  };
}
