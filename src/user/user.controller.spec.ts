import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('UserController', () => {
  let controller: UserController;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    fName: 'John',
    lName: 'Doe',
    email: 'john@example.com',
  };

  const mockUserService = {
    getAllUsers: vi.fn().mockResolvedValue([mockUser]),
    getUserById: vi.fn().mockResolvedValue(mockUser),
    updateUser: vi.fn().mockResolvedValue({ message: 'User updated successfully', user: mockUser }),
    deleteUser: vi.fn().mockResolvedValue({ message: 'User deleted successfully', user: mockUser }),
    createUser: vi.fn().mockResolvedValue(mockUser),
  };

  const mockJwtService = {
    verifyAsync: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all users', async () => {
    const result = await controller.getAllUsers();
    expect(result).toEqual([mockUser]);
    expect(mockUserService.getAllUsers).toHaveBeenCalled();
  });

  it('should get user by id', async () => {
    const result = await controller.getUserById('507f1f77bcf86cd799439011');
    expect(result).toEqual(mockUser);
    expect(mockUserService.getUserById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('should update user', async () => {
    const updateDto = { fName: 'Jane' };
    const result = await controller.updateUser('507f1f77bcf86cd799439011', updateDto);
    expect(result).toEqual({ message: 'User updated successfully', user: mockUser });
    expect(mockUserService.updateUser).toHaveBeenCalledWith('507f1f77bcf86cd799439011', updateDto);
  });

  it('should delete user', async () => {
    const result = await controller.deleteUser('507f1f77bcf86cd799439011');
    expect(result).toEqual({ message: 'User deleted successfully', user: mockUser });
    expect(mockUserService.deleteUser).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
