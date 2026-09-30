import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponse } from '@sdms/shared-types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId || (req.headers['x-request-id'] as string) || 'unknown-req';

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        statusCode: res.statusCode,
        data,
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
