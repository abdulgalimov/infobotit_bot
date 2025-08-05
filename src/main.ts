import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { addSwagger } from './utils/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getBotToken } from 'nestjs-telegraf';
import { loadConfig } from './config';
import { InfobotLogger } from './logger';

async function bootstrap() {
  const appConfig = loadConfig();
  const { telegram, port } = appConfig;

  InfobotLogger.initGlobalConfig({
    appConfig,
  });
  const logger = new InfobotLogger('main');

  process.on('uncaughtException', (reason: Error, origin) => {
    logger.error(reason, 'Uncaught exception');
  });

  process.on('unhandledRejection', (reason: string) => {
    logger.errorCustom('Unhandled rejection', {
      reason,
    });
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  if (telegram.webhook) {
    const bot = app.get(getBotToken());
    app.use(bot.webhookCallback(telegram.webhook.path));
  }

  addSwagger(app);

  await app.listen(port);

  logger.debug(`Starting with port ${port}`);
}
bootstrap();
