import * as ngrok from 'ngrok';
import * as fs from 'fs';

const envFile = '.run.env';
const env = fs.readFileSync(envFile).toString();
const webUrlReg = /^WEB_URL=.+$/m;
const portReg = /^PORT=(?<port>.+)$/m;

async function bootstrap() {
  const url = await ngrok.connect({
    proto: 'http',
    addr: portReg.exec(env).groups.port,
    onStatusChange: (status) => {
      console.log('onStatusChange', status);
    },
    onLogEvent: (data) => {
      console.log('onLogEvent', data);
    },
  });
  const newEnv = env.replace(webUrlReg, `WEB_URL=${url}`);

  fs.writeFileSync(envFile, newEnv);
  console.log('proxy url', url);
}
bootstrap();
