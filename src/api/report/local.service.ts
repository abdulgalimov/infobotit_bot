import fs from 'fs';
import readline from 'readline';

export class LocalService {
  async readLog() {
    const fileStream = fs.createReadStream('temp/log.txt');

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const body = JSON.parse(line);
      //await this.handleReportSafe(body);
    }
  }
}
