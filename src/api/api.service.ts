import { Injectable } from '@nestjs/common';
import * as tmp from 'tmp';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class ApiService {
  public async saveTempFile(fileUrl: string) {
    console.log('saveTempFile', fileUrl);
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

    const tempFile = tmp.fileSync({
      postfix: `-audio.wav`,
      keep: true,
      discardDescriptor: true,
    });

    fs.writeFileSync(tempFile.name, response.data);

    return tempFile;
  }
}
