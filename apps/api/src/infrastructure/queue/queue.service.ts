import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly redisConfig: { host: string; port: number; password?: string };

  constructor(private readonly configService: ConfigService) {
    this.redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    };
  }

  async onModuleDestroy() {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.logger.log('All queues and workers closed');
  }

  private getConnectionConfig() {
    return {
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password,
    };
  }

  getQueue(name: string, options?: Partial<QueueOptions>): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const prefix = this.configService.get<string>('BULL_QUEUE_PREFIX', 'crm');

    const queue = new Queue(name, {
      connection: this.getConnectionConfig(),
      prefix,
      defaultJobOptions: {
        attempts: options?.defaultJobOptions?.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
      ...options,
    });

    this.queues.set(name, queue);
    this.logger.log(`Queue "${name}" initialized`);
    return queue;
  }

  registerWorker(
    queueName: string,
    processor: (job: Job) => Promise<void>,
    options?: Partial<WorkerOptions>,
  ): Worker {
    const worker = new Worker(queueName, processor, {
      connection: this.getConnectionConfig(),
      concurrency: options?.concurrency || 5,
      ...options,
    });

    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} in "${queueName}" completed`);
    });

    worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} in "${queueName}" failed: ${error.message}`);
    });

    worker.on('error', (error) => {
      this.logger.error(`Worker "${queueName}" error: ${error.message}`);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Worker for "${queueName}" registered`);
    return worker;
  }

  async addJob<T = unknown>(
    queueName: string,
    name: string,
    data: T,
    options?: {
      delay?: number;
      priority?: number;
      jobId?: string;
      attempts?: number;
    },
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(name, data, {
      delay: options?.delay,
      priority: options?.priority,
      jobId: options?.jobId,
      attempts: options?.attempts,
    });
    this.logger.debug(`Job "${name}" added to "${queueName}" [${job.id}]`);
    return job;
  }

  async getJobCounts(queueName: string): Promise<Record<string, number>> {
    const queue = this.getQueue(queueName);
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return counts;
  }

  async getQueueHealth(): Promise<Record<string, { waiting: number; active: number; failed: number }>> {
    const health: Record<string, { waiting: number; active: number; failed: number }> = {};

    for (const [name, queue] of this.queues) {
      const counts = await queue.getJobCounts('waiting', 'active', 'failed');
      health[name] = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        failed: counts.failed || 0,
      };
    }

    return health;
  }
}
