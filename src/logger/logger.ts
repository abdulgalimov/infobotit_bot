import winston, { type Logger } from 'winston';
import LokiTransport from 'winston-loki';
import Transport from 'winston-transport';
import { Config } from '../config';

type LogPrimitives =
  | string
  | number
  | null
  | undefined
  | unknown
  | symbol
  | object;
type LogData = {
  [key: string | number | symbol]:
    | LogPrimitives
    | LogData
    | LogPrimitives[]
    | LogData[];
};

function createLokiTransport(appConfig: Config) {
  if (!appConfig.logger.lokiUrl) {
    throw new Error('Otel config does not exist!');
  }

  const { lokiUrl, level } = appConfig.logger;

  return new LokiTransport({
    host: lokiUrl,
    labels: { app: 'infobot' },
    json: true,
    interval: 5,
    batching: true,
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });
}

type LoggerGlobalOptions = {
  appConfig: Config;
};

export class InfobotLogger {
  public static globalOptions: LoggerGlobalOptions | null = null;
  public static initGlobalConfig(options: LoggerGlobalOptions) {
    InfobotLogger.globalOptions = options as LoggerGlobalOptions;
  }

  private readonly name: string;

  private readonly logger: Logger;

  public constructor(name: string) {
    const transports: Transport[] = [];
    if (InfobotLogger.globalOptions?.appConfig?.logger?.lokiUrl) {
      transports.push(
        createLokiTransport(InfobotLogger.globalOptions?.appConfig),
      );
    }

    if (InfobotLogger.globalOptions?.appConfig?.debug.debugMode) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf((info) => {
              const { timestamp, level, service, message, ...otherData } = info;
              const otherStr =
                Object.keys(otherData).length > 0
                  ? JSON.stringify(otherData, null, 2)
                  : '';
              return `${timestamp} - [${level}] [${service}] ${message} ${otherStr}`;
            }),
          ),
        }),
      );
    }

    const level =
      InfobotLogger.globalOptions?.appConfig?.logger.level || 'info';
    this.logger = winston.createLogger({
      level,
      defaultMeta: { service: name ?? '' },
      transports,
    });
  }

  public error(error: unknown, message: string): void {
    this.logger.error(
      message,
      this.formatMetaError({
        error,
      }),
    );
  }

  public errorCustom(message: string, details: LogData): void {
    this.logger.error(message, this.formatMetaError(details));
  }

  public debug(message: string, data?: LogData): void {
    this.logger.debug(message, this.formatMetaError(data));
  }

  public warn(message: string, data?: LogData): void {
    this.logger.warn(message, this.formatMetaError(data));
  }

  private formatMetaError(meta?: unknown): unknown | undefined {
    if (!meta) {
      return undefined;
    }
    if (typeof meta !== 'object') {
      return { meta };
    }

    if (meta instanceof Error) {
      return meta;
    }

    let formattedMeta = meta;
    if ('message' in meta) {
      const { message, ...otherMeta } = meta;
      formattedMeta = { ...otherMeta };
      (formattedMeta as Record<string, unknown>)['@message'] = message;
    }

    const entries = Object.entries(formattedMeta);
    const errorEntry = entries.find(([_k, v]) => v instanceof Error);
    if (!errorEntry) {
      return formattedMeta;
    }
    const error = errorEntry[1] as Record<string, unknown>;

    entries.forEach(([k, v]) => {
      if (v !== error) {
        error[k] = v;
      }
    });

    return error;
  }
}
