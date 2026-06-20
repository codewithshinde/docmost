import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { EnvironmentService } from '../environment/environment.service';

/**
 * AES-256-GCM encryption for secrets stored at rest (e.g. integration API keys).
 * The key is derived from APP_SECRET, so rotating APP_SECRET invalidates
 * previously stored ciphertext (which then needs to be re-entered).
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(private readonly environmentService: EnvironmentService) {
    const secret =
      this.environmentService.getAppSecret() ||
      'docmost-default-insecure-app-secret';
    this.key = scryptSync(secret, 'docmost-integration-secrets', 32);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64'),
      tag.toString('base64'),
      enc.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [version, ivB64, tagB64, dataB64] = payload.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
      throw new Error('Unsupported or malformed ciphertext');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  encryptJson(obj: Record<string, unknown>): string {
    return this.encrypt(JSON.stringify(obj ?? {}));
  }

  decryptJson<T = Record<string, any>>(payload: string | null | undefined): T {
    if (!payload) return {} as T;
    try {
      return JSON.parse(this.decrypt(payload)) as T;
    } catch (err) {
      this.logger.warn(
        `Failed to decrypt stored secrets (APP_SECRET may have changed): ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
      return {} as T;
    }
  }
}
