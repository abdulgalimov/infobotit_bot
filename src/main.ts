import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { addSwagger } from './utils/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { initSentry } from './sentry';
import { startMetricsServer } from './monitoring/monitoring.server';
import { getBotToken } from 'nestjs-telegraf';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { loadSslConfig, WebConfig } from './config';

async function bootstrap() {
  const sslConfig = loadSslConfig();
  const httpsOptions: HttpsOptions = {};
  if (sslConfig) {
    const { keyFile, certFile } = sslConfig;
    httpsOptions.key = fs.readFileSync(keyFile).toString();
    httpsOptions.cert = fs.readFileSync(certFile).toString();
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });
  const config = app.get<ConfigService>(ConfigService);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const bot = app.get(getBotToken());
  app.use(bot.webhookCallback('/tg-update'));

  initSentry(app);
  addSwagger(app);

  const { port } = config.getOrThrow<WebConfig>('web');
  await app.listen(port);

  console.log(`Starting with port ${port}`);

  await startMetricsServer(app);
}
bootstrap();
