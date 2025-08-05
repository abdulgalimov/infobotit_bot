import fs from 'fs';
import readline from 'readline';
import { ReportService } from './report.service';

export class LocalService {
  constructor(private reportService: ReportService, loadFromFile: string) {
    this.readLog(loadFromFile).then();
  }
  async readLog(loadFromFile: string) {
    const filePath = `temp/${loadFromFile}`;
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const body = JSON.parse(line);
      await this.reportService.handleReportSafe(body);
    }
  }
}
