import { Injectable } from '@nestjs/common';
import * as tmp from 'tmp';
import * as fs from 'fs';
import axios from 'axios';
import * as ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath);

function convertWavToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('end', () => {
        console.log('Конвертация завершена!');
        resolve(true);
      })
      .on('error', (err) => {
        console.error('Ошибка конвертации:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

@Injectable()
export class ApiService {
  public async saveTempFile(fileUrl: string) {
    console.log('saveTempFile', fileUrl);
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

    await convertWavToMp3(tempFileWav.name, tempFileMp3.name);

    tempFileWav.removeCallback();

    return tempFileMp3;
  }
}
