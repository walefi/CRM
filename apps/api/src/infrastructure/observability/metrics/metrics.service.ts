import { Injectable, Logger } from '@nestjs/common';

interface MetricLabel {
  name: string;
  value: string;
}

interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels?: MetricLabel[];
  timestamp: string;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, number> = new Map();

  incrementCounter(name: string, labels?: MetricLabel[]) {
    const key = this.buildKey(name, labels);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    this.logger.debug(`Metric ${key}: ${current + 1}`);
  }

  setGauge(name: string, value: number, labels?: MetricLabel[]) {
    const key = this.buildKey(name, labels);
    this.metrics.set(key, value);
  }

  observeHistogram(name: string, value: number, labels?: MetricLabel[]) {
    const key = this.buildKey(name, labels);
    this.logger.debug(`Histogram ${key}: ${value}`);
  }

  getMetrics(): Metric[] {
    const results: Metric[] = [];
    this.metrics.forEach((value, key) => {
      results.push({
        name: key,
        help: `Metric: ${key}`,
        type: 'counter',
        value,
        timestamp: new Date().toISOString(),
      });
    });
    return results;
  }

  private buildKey(name: string, labels?: MetricLabel[]): string {
    if (!labels || labels.length === 0) return name;
    const labelStr = labels.map((l) => `${l.name}=${l.value}`).join(',');
    return `${name}{${labelStr}}`;
  }
}
