import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    refreshTokens: vi.fn(),
    logout: vi.fn(),
  };

  const mockJwtService = {
    verifyAsync: vi.fn(),
    signAsync: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
