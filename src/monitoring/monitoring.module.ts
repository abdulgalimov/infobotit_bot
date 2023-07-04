import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { NoopMetricsController } from './controllers/noop.metrics.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HealthService, PrometheusHealthService } from './health';
import { HealthMetric, RequestsMetric } from './metrics';
import { RequestsMiddleware } from './middleware/requests.middleware';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      controller: NoopMetricsController,
    }),
    TerminusModule,
  ],
  providers: [
    HealthService,
    PrometheusHealthService,
    RequestsMetric,
    HealthMetric,
  ],
  exports: [],
})
export class MonitoringModule implements NestModule {
  // eslint-disable-next-line class-methods-use-this
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestsMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
