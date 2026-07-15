import { Injectable, Logger } from '@nestjs/common';

interface SpanContext {
  traceId: string;
  spanId: string;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);

  startSpan(name: string, context?: SpanContext): SpanContext {
    const traceId = context?.traceId || this.generateId();
    const spanId = this.generateId();
    this.logger.debug(`Span started: ${name} [trace=${traceId}, span=${spanId}]`);
    return { traceId, spanId };
  }

  endSpan(context: SpanContext) {
    this.logger.debug(`Span ended [trace=${context.traceId}, span=${context.spanId}]`);
  }

  private generateId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}
