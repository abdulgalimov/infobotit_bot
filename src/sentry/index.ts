import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Sentry from '@sentry/node';
import { SentryInterceptor } from './sentry.interceptor';
import { SentryLogger } from './sentry.logger';
import { Config, SentryConfig } from '../config';

export const initSentry = (app: INestApplication) => {
  const config: ConfigService<Config> = app.get(ConfigService);

  const sentryConfig = config.get<SentryConfig>('sentry');
  if (!sentryConfig) return;

  const { dsnUrl, environment } = sentryConfig;

  Sentry.init({
    environment: environment,
    dsn: dsnUrl,
    tracesSampleRate: 1.0,
    release: '1',
    normalizeDepth: 10,
  });

  app.useGlobalInterceptors(new SentryInterceptor());
  app.useLogger(new SentryLogger());
};
