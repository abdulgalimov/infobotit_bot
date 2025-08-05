import { Injectable, StreamableFile } from '@nestjs/common';
import fs from 'fs';
import { Express } from 'express';

@Injectable()
export class FilesService {
  private getFullFilename(filename: string): string {
    return `${process.cwd()}/temp/${filename}`;
  }

  public async getFile(filename: string) {
    console.log('getFile', filename);

    const fullFilename = this.getFullFilename(filename);

    const file = fs.createReadStream(fullFilename);

    return new StreamableFile(file, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  public async uploadFile(file: Express.Multer.File) {
    console.log('uploadFile', file.originalname);

    const fullFilename = this.getFullFilename(file.originalname);

    const stream = fs.createWriteStream(fullFilename);

    stream.write(file.buffer);
  }
}
