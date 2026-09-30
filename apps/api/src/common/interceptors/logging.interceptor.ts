import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${requestId}] ${method} ${originalUrl} ${res.statusCode} +${duration}ms [${ip}]`,
          );
        },
        error: (err: unknown) => {
          const duration = Date.now() - startTime;
          const status =
            typeof err === 'object' && err !== null && 'getStatus' in err
              ? (err as { getStatus: () => number }).getStatus()
              : 500;
          this.logger.warn(
            `[${requestId}] ${method} ${originalUrl} ${status} +${duration}ms [${ip}]`,
          );
        },
      }),
    );
  }
}
