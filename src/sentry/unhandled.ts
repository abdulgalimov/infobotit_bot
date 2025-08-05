import Sentry from '@sentry/node';

process.on('uncaughtException', (reason: Error, origin) => {
  console.log('uncaughtException', reason, origin);
  Sentry.captureException(reason, {
    extra: {
      uncaughtException: true,
      origin,
    },
  });
});

process.on('unhandledRejection', (reason: string) => {
  console.log('unhandledRejection', reason);
  Sentry.captureMessage(`UnhandledRejection: ${reason}`, {
    extra: {
      unhandledRejection: true,
    },
  });
});
