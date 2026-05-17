/**
 * Walrus publisher and aggregator client.
 * Handles schema publishing (server-side) and blob verification.
 */
import { logger } from '../../shared/logger.js';
import { ExternalServiceError } from '../../shared/errors/index.js';

export interface WalrusClientConfig {
  publisherEndpoint: string;
  aggregatorEndpoint: string;
  defaultEpochs: number;
}

export interface BlobMetadata {
  blobId: string;
  size: number;
  contentType: string;
  exists: boolean;
}

export interface PublishResult {
  blobId: string;
}

export class WalrusClient {
  constructor(private readonly config: WalrusClientConfig) {}

  /**
   * Publish a blob to Walrus via the publisher HTTP API.
   * Used for server-side schema publishing (small JSON blobs).
   */
  async publishBlob(data: Uint8Array | string, epochs?: number): Promise<PublishResult> {
    const body = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const ep = epochs ?? this.config.defaultEpochs;

    try {
      const response = await fetch(
        `${this.config.publisherEndpoint}/v1/blobs?epochs=${ep}`,
        {
          method: 'PUT',
          body: body as BodyInit,
          headers: { 'Content-Type': 'application/octet-stream' },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Publisher returned ${response.status}: ${text}`);
      }

      const result = await response.json() as Record<string, unknown>;

      // The publisher returns either { newlyCreated: { blobObject: { blobId } } }
      // or { alreadyCertified: { blobId } }
      let blobId: string | undefined;

      if (result['newlyCreated'] && typeof result['newlyCreated'] === 'object') {
        const nc = result['newlyCreated'] as Record<string, unknown>;
        const bo = nc['blobObject'] as Record<string, unknown> | undefined;
        blobId = bo?.['blobId'] as string | undefined;
      } else if (result['alreadyCertified'] && typeof result['alreadyCertified'] === 'object') {
        const ac = result['alreadyCertified'] as Record<string, unknown>;
        blobId = ac['blobId'] as string | undefined;
      }

      if (!blobId) {
        throw new Error(`Unexpected publisher response: ${JSON.stringify(result)}`);
      }

      logger.info({ blobId, size: body.length }, '[Walrus] Blob published');
      return { blobId };
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError('Walrus Publisher', msg);
    }
  }

  /**
   * Verify a blob exists on Walrus by fetching its head from the aggregator.
   */
  async verifyBlob(blobId: string): Promise<BlobMetadata> {
    try {
      const response = await fetch(
        `${this.config.aggregatorEndpoint}/v1/blobs/${blobId}`,
        { method: 'HEAD' }
      );

      if (response.status === 404) {
        return { blobId, size: 0, contentType: '', exists: false };
      }

      if (!response.ok) {
        throw new Error(`Aggregator returned ${response.status}`);
      }

      const size = parseInt(response.headers.get('content-length') ?? '0', 10);
      const contentType = response.headers.get('content-type') ?? 'application/octet-stream';

      return { blobId, size, contentType, exists: true };
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError('Walrus Aggregator', msg);
    }
  }

  /**
   * Fetch blob content from the aggregator.
   * Only used for small server-side reads (submission content for AI analysis).
   */
  async fetchBlobContent(blobId: string): Promise<Uint8Array> {
    try {
      const response = await fetch(
        `${this.config.aggregatorEndpoint}/v1/blobs/${blobId}`
      );

      if (!response.ok) {
        throw new Error(`Aggregator returned ${response.status}`);
      }

      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError('Walrus Aggregator', msg);
    }
  }

  /**
   * Check aggregator reachability for health checks.
   *
   * Strategy: issue a GET to /v1/info (returns 200 with network info on real nodes)
   * and fall back to treating any HTTP response (even 404) as "reachable" —
   * a DNS/TCP failure is the only hard "unreachable" condition.
   */
  async isAggregatorReachable(): Promise<boolean> {
    const url = `${this.config.aggregatorEndpoint}/v1`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      });
      // Any HTTP response means the host is up and the network path is open.
      // 404/405 on the root path is normal for Walrus aggregators.
      logger.debug(
        { status: response.status, url },
        '[Walrus] Aggregator reachability check'
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ url, error: msg }, '[Walrus] Aggregator unreachable');
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Phase B: Storage Monitoring & Renewal
  // ---------------------------------------------------------------------------

  /**
   * Fetch storage status for a blob (epochs remaining, etc.).
   * Mocks the response for now until a stable HTTP / blob-info endpoint is documented.
   */
  async getBlobStorageStatus(blobId: string): Promise<{ expiresAtEpoch: number; isExpiringSoon: boolean }> {
    if (!blobId) throw new Error('Blob ID required');
    // Stub implementation: assume blob is active and expires far in the future
    return {
      expiresAtEpoch: Math.floor(Date.now() / 86400000) + 30, // 30 days proxy
      isExpiringSoon: false,
    };
  }

  /**
   * Renew a blob for the given number of epochs.
   * Currently mocked to always succeed.
   */
  async renewBlobStorage(blobId: string, epochs: number): Promise<{ success: boolean; newExpiresAtEpoch: number }> {
    if (!blobId || epochs <= 0) throw new Error('Invalid renewal parameters');
    logger.info({ blobId, epochs }, '[Walrus] Blob storage renewed (stub)');
    return {
      success: true,
      newExpiresAtEpoch: Math.floor(Date.now() / 86400000) + epochs,
    };
  }

  /**
   * Check the WAL balance of the server wallet.
   * Used to trigger alerts if funding runs low.
   */
  async getServerWalBalance(): Promise<number> {
    // Stub implementation
    return 1000000000; // 1 WAL
  }
}
