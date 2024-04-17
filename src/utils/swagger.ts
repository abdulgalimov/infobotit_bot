import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { ApiModule } from '../api/api.module';

const runInfoFile = './config/run-info.txt';
const runInfo = fs.existsSync(runInfoFile)
  ? fs.readFileSync(runInfoFile).toString()
  : '';
console.log('runInfo', runInfo);

export function addSwagger(app: NestExpressApplication) {
  const config = new DocumentBuilder()
    .addSecurity('JWT', {
      description: 'Example: <code>Bearer {token here}</code>',
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
    })
    .setTitle('Infobot')
    .setDescription(
      `<pre>
Build date: ${new Date().toString()}

${runInfo}
</pre>`,
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [ApiModule],
  });

  SwaggerModule.setup('app/swagger', app, document);

  return document;
}
