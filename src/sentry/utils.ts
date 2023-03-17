import { ExecutionContext } from '@nestjs/common';
import { Extras } from '@sentry/types';
import { Request } from 'express';

export const getExtra = (error: unknown, context: ExecutionContext): Extras => {
  const extra = {
    error,
    request: undefined,
  };

  const request = context.getArgByIndex<Request>(0);
  if (request) {
    extra.request = {
      ip: request.ip,
      url: request.url,
      body: JSON.stringify(request.body),
      query: request.query,
      params: request.params,
      headers: request.headers,
      cookies: request.cookies,
    };
  }

  return extra;
};
