import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema.js';
import { vi } from 'vitest';

describe('UserService', () => {
  let service: UserService;

  const mockUserModel = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
