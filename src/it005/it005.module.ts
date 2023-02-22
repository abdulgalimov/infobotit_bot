import { Module } from '@nestjs/common';
import { It005ApiService } from './it005.api';

@Module({
  providers: [It005ApiService],
  exports: [It005ApiService],
})
export class It005Module {}
