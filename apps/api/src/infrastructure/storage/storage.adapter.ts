export interface StoragePutResult {
  key: string;
  provider: string;
  size: number;
}

export interface StorageAdapter {
  put(key: string, data: Buffer, options?: { mimeType?: string }): Promise<StoragePutResult>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
