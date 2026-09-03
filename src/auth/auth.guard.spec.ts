import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    };
    guard = new AuthGuard(jwtService as unknown as JwtService);
  });

  const createMockContext = (authHeader?: string): { context: ExecutionContext; request: any } => {
    const request = {
      headers: {
        authorization: authHeader,
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    const { context } = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if header is not Bearer', async () => {
    const { context } = createMockContext('Basic xyz');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
    const { context } = createMockContext('Bearer invalid.jwt.token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach payload to request and return true on valid token', async () => {
    const payload = { sub: 'user-123', email: 'test@example.com' };
    jwtService.verifyAsync.mockResolvedValue(payload);

    const { context, request } = createMockContext('Bearer valid.jwt.token');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(payload);
  });
});
