import { Injectable, Scope, Logger } from '@nestjs/common';
import { Request } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
}

const tenantStorage = new AsyncLocalStorage<TenantInfo>();

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private readonly logger = new Logger(TenantContext.name);
  private tenantInfo: TenantInfo | null = null;

  get current(): TenantInfo | null {
    return tenantStorage.getStore() || this.tenantInfo;
  }

  get currentId(): string | null {
    return this.current?.id || null;
  }

  get currentSlug(): string | null {
    return this.current?.slug || null;
  }

  set(tenant: TenantInfo): void {
    this.tenantInfo = tenant;
  }

  clear(): void {
    this.tenantInfo = null;
  }

  isActive(): boolean {
    return this.current?.status === 'ACTIVE';
  }

  static run<T>(tenant: TenantInfo, fn: () => T): T {
    return tenantStorage.run(tenant, fn);
  }
}
