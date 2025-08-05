import { Injectable } from '@nestjs/common';
import tmp from 'tmp';
import fs from 'fs';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { InfobotLogger } from '../logger';

ffmpeg.setFfmpegPath(ffmpegPath);

function convertWavToMp3(inputPath, outputPath, logger: InfobotLogger) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('end', () => {
        logger.debug('Convert complete');
        resolve(true);
      })
      .on('error', (err) => {
        logger.errorCustom('Convert error', {
          err,
          inputPath,
          outputPath,
        });
        reject(err);
      })
      .save(outputPath);
  });
}

@Injectable()
export class ApiService {
  private readonly logger: InfobotLogger;

  public constructor() {
    this.logger = new InfobotLogger(ApiService.name);
  }

  public async saveTempFile(fileUrl: string) {
    this.logger.debug('Save temp file', {
      fileUrl,
    });
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

    const tempFileWav = tmp.fileSync({
      postfix: `-audio.wav`,
      keep: true,
      discardDescriptor: true,
    });

    fs.writeFileSync(tempFileWav.name, response.data);

    const tempFileMp3 = tmp.fileSync({
      postfix: `-audio.mp3`,
      keep: true,
      discardDescriptor: true,
    });

    await convertWavToMp3(tempFileWav.name, tempFileMp3.name, this.logger);

    tempFileWav.removeCallback();

    return tempFileMp3;
  }
}
