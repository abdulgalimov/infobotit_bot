/* eslint-disable class-methods-use-this */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { CaptureContext } from '@sentry/types';
import * as Sentry from '@sentry/node';
import { catchError } from 'rxjs/operators';
import { getExtra } from './utils';

interface SentryError {
  isUserError?: boolean;
}

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  handleError(error: SentryError, context?: ExecutionContext): Observable<any> {
    const captureContext: CaptureContext = {
      extra: getExtra(error, context),
      tags: {},
    };

    if (!error.isUserError) {
      Sentry.captureException(error, captureContext);
    }

    return throwError(() => error);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(catchError((error) => this.handleError(error, context)));
  }
}
