import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { addSwagger } from './utils/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { initSentry } from './sentry';
import { getBotToken } from 'nestjs-telegraf';
import { TelegramConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  const telegramConfig = config.getOrThrow<TelegramConfig>('telegram');

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  if (telegramConfig.webhook) {
    const bot = app.get(getBotToken());
    app.use(bot.webhookCallback(telegramConfig.webhook.path));
  }

  initSentry(app);
  addSwagger(app);

  const port = config.getOrThrow('port');
  await app.listen(port);

  console.log(`Starting with port ${port}`);
}
bootstrap();
