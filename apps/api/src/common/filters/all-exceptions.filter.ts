import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiProblem } from '@accentrax/types';
import type { Request, Response } from 'express';

/**
 * Formats every error as an RFC7807-style problem+json payload,
 * so clients get a consistent error shape across the API.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let title = 'Internal Server Error';
    let detail: string | undefined;
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        title = response;
      } else if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        title = (body.error as string) ?? exception.name;
        const message = body.message;
        if (Array.isArray(message)) {
          detail = message.join(', ');
          errors = { _: message as string[] };
        } else if (typeof message === 'string') {
          detail = message;
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const problem: ApiProblem = {
      type: 'about:blank',
      title,
      status,
      detail,
      instance: req.url,
      errors,
    };

    res.status(status).json(problem);
  }
}
