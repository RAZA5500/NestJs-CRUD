import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshToken } from './schemas/refreshToken.schema.js';
import {
  hashRefreshToken,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  REFRESH_TOKEN_TYPE,
} from './token.constants.js';

describe('AuthService', () => {
  let service: AuthService;

  const userId = new Types.ObjectId();
  const storedUser = {
    _id: userId,
    email: 'admin@gmail.com',
    role: 'ADMIN',
    // bcrypt hash of "12345678"
    password: '$2b$10$npI5wYf8d2Z5hSbXnr/xJurwqXsfaptVM74WA3y1s9lj7FUePkfsi',
  };

  const mockUserService = {
    createUser: vi.fn(),
    findByEmail: vi.fn(),
    loginUser: vi.fn(),
    getUserById: vi.fn(),
  };

  const mockJwtService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
  };

  const mockRefreshTokenModel = {
    create: vi.fn(),
    findOneAndDelete: vi.fn(),
    deleteOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUserService.loginUser.mockResolvedValue(storedUser);
    mockUserService.getUserById.mockResolvedValue(storedUser);
    mockJwtService.signAsync.mockImplementation((payload: { type?: string }) =>
      Promise.resolve(
        payload.type === REFRESH_TOKEN_TYPE ? 'refresh.jwt' : 'access.jwt',
      ),
    );
    mockRefreshTokenModel.create.mockResolvedValue({});
    mockRefreshTokenModel.findOneAndDelete.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ userId }),
    });
    mockRefreshTokenModel.deleteOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginUser', () => {
    it('returns an access token and a refresh token', async () => {
      const result = await service.loginUser({
        email: 'admin@gmail.com',
        password: '12345678',
      });

      expect(result).toMatchObject({
        access_token: 'access.jwt',
        refresh_token: 'refresh.jwt',
        role: 'ADMIN',
      });
    });

    it('signs the refresh token for 20 days with its own claim', async () => {
      await service.loginUser({
        email: 'admin@gmail.com',
        password: '12345678',
      });

      expect(REFRESH_TOKEN_TTL_DAYS).toBe(20);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId.toString(),
          type: REFRESH_TOKEN_TYPE,
          // unique per token, so two logins a second apart never collide
          jti: expect.any(String),
        }),
        expect.objectContaining({ expiresIn: REFRESH_TOKEN_TTL }),
      );
    });

    it('stores only the hash of the refresh token, with its expiry', async () => {
      const before = Date.now();

      await service.loginUser({
        email: 'admin@gmail.com',
        password: '12345678',
      });

      const stored = mockRefreshTokenModel.create.mock.calls[0][0];
      expect(stored.tokenHash).toBe(hashRefreshToken('refresh.jwt'));
      expect(stored.tokenHash).not.toContain('refresh.jwt');
      expect(stored.expiresAt.getTime() - before).toBeCloseTo(
        REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        -4,
      );
    });

    it('rejects a wrong password before issuing anything', async () => {
      await expect(
        service.loginUser({ email: 'admin@gmail.com', password: 'nope' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId.toString(),
        type: REFRESH_TOKEN_TYPE,
      });
    });

    it('rotates the token: consumes the old row and issues a new pair', async () => {
      const result = await service.refreshTokens('refresh.jwt');

      expect(mockRefreshTokenModel.findOneAndDelete).toHaveBeenCalledWith({
        tokenHash: hashRefreshToken('refresh.jwt'),
      });
      expect(result).toMatchObject({
        access_token: 'access.jwt',
        refresh_token: 'refresh.jwt',
        role: 'ADMIN',
      });
      expect(mockRefreshTokenModel.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a token that was already used or revoked', async () => {
      mockRefreshTokenModel.findOneAndDelete.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(service.refreshTokens('refresh.jwt')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });

    it('rejects an access token presented as a refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId.toString(),
        email: 'admin@gmail.com',
        role: 'ADMIN',
      });

      await expect(service.refreshTokens('access.jwt')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenModel.findOneAndDelete).not.toHaveBeenCalled();
    });

    it('rejects an expired or tampered token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refreshTokens('refresh.jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when the account behind the token is gone', async () => {
      mockUserService.getUserById.mockRejectedValue(new Error('not found'));

      await expect(service.refreshTokens('refresh.jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('deletes the refresh token row', async () => {
      await service.logout('refresh.jwt');

      expect(mockRefreshTokenModel.deleteOne).toHaveBeenCalledWith({
        tokenHash: hashRefreshToken('refresh.jwt'),
      });
    });

    it('is a no-op when no refresh token is sent', async () => {
      await expect(service.logout(undefined)).resolves.toMatchObject({
        message: 'Logged out successfully',
      });

      expect(mockRefreshTokenModel.deleteOne).not.toHaveBeenCalled();
    });
  });
});
