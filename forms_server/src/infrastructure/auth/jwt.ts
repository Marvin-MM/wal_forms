/**
 * JWT authentication using jose.
 * Access tokens: 15min. Refresh tokens: 7 days.
 */
import * as jose from 'jose';
import { logger } from '../../shared/logger.js';
import { AuthenticationError } from '../../shared/errors/index.js';

export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
}

export interface JwtPayload {
  wallet: string;
  role: string;
}

export class JwtService {
  private readonly secret: Uint8Array;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: JwtConfig) {
    this.secret = new TextEncoder().encode(config.secret);
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  async signAccessToken(payload: JwtPayload): Promise<string> {
    return new jose.SignJWT({ wallet: payload.wallet, role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime('15m')
      .sign(this.secret);
  }

  async signRefreshToken(payload: JwtPayload): Promise<string> {
    return new jose.SignJWT({ wallet: payload.wallet, role: payload.role, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime('7d')
      .sign(this.secret);
  }

  async verify(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      });
      const wallet = payload['wallet'];
      const role = payload['role'];
      if (typeof wallet !== 'string' || typeof role !== 'string') {
        throw new Error('Invalid token payload');
      }
      return { wallet, role };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invalid token';
      logger.debug({ error: msg }, '[JWT] Token verification failed');
      throw new AuthenticationError('Invalid or expired token');
    }
  }
}
