import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserService = {
    createUser: vi.fn(),
    findByEmail: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
