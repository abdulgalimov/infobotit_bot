import { Injectable } from '@nestjs/common';
import * as tmp from 'tmp';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class ApiService {
  public async saveTempFile(fileUrl: string): Promise<void> {
    console.log('saveTempFile', fileUrl);
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

    return new Promise((resolve) => {
      tmp.file(
        { postfix: `-audio.wav` },
        (err, tempFilePath, fd, cleanupCallback) => {
          console.log('save tmp file', err, tempFilePath);
          if (err) {
            console.error('Ошибка создания временного файла:', err);
            return;
          }

          fs.writeFileSync(tempFilePath, response.data);

          setTimeout(() => {
            console.log('saveTempFile setTimeout');
            cleanupCallback();
          }, 60_000);

          resolve(tempFilePath);
        },
      );
    });
  }
}
