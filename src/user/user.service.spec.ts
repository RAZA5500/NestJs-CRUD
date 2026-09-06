import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema.js';
import { vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    fName: 'John',
    lName: 'Doe',
    email: 'john@example.com',
    role: 'user',
  };

  const demoUser = {
    _id: '507f1f77bcf86cd799439012',
    fName: 'Demo',
    lName: 'Admin',
    email: 'admin@gmail.com',
    password: 'hashed',
    role: 'ADMIN',
  };

  const createQueryMock = (resolvedValue: any) => ({
    select: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(resolvedValue),
    }),
  });

  const createExecMock = (resolvedValue: any) => ({
    exec: vi.fn().mockResolvedValue(resolvedValue),
  });

  const mockUserModel = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

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

  describe('getAllUsers', () => {
    it('should return all users without passwords', async () => {
      mockUserModel.find.mockReturnValue(createQueryMock([mockUser]));

      const result = await service.getAllUsers();
      expect(result).toEqual([mockUser]);
      expect(mockUserModel.find).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.getUserById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserModel.findById.mockReturnValue(createQueryMock(null));

      await expect(
        service.getUserById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return the user if found', async () => {
      mockUserModel.findById.mockReturnValue(createQueryMock(mockUser));

      const result = await service.getUserById('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.updateUser('invalid-id', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      mockUserModel.findById.mockReturnValue(createExecMock(null));

      await expect(
        service.updateUser('507f1f77bcf86cd799439011', { fName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should update user successfully and return message with user', async () => {
      const updatedMockUser = { ...mockUser, fName: 'Jane' };
      mockUserModel.findById.mockReturnValue(createExecMock(mockUser));
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        createQueryMock(updatedMockUser),
      );

      const result = await service.updateUser('507f1f77bcf86cd799439011', {
        fName: 'Jane',
      });

      expect(result).toEqual({
        message: 'User updated successfully',
        user: updatedMockUser,
      });
    });
  });

  describe('updateUser on a demo account', () => {
    beforeEach(() => {
      mockUserModel.findById.mockReturnValue(createExecMock(demoUser));
    });

    it('should throw ForbiddenException when the name is changed', async () => {
      await expect(
        service.updateUser(demoUser._id, { fName: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the email is changed', async () => {
      await expect(
        service.updateUser(demoUser._id, { email: 'someone@else.com' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the password is changed', async () => {
      await expect(
        service.updateUser(demoUser._id, {
          currentPassword: '12345678',
          password: 'newpassword',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should allow an update that resends the locked fields unchanged', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        createQueryMock(demoUser),
      );

      const result = await service.updateUser(demoUser._id, {
        fName: demoUser.fName,
        lName: demoUser.lName,
        email: demoUser.email,
      });

      expect(result).toEqual({
        message: 'User updated successfully',
        user: demoUser,
      });
    });
  });

  describe('deleteUser', () => {
    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.deleteUser('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user to delete does not exist', async () => {
      mockUserModel.findById.mockReturnValue(createExecMock(null));

      await expect(
        service.deleteUser('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is a demo account', async () => {
      mockUserModel.findById.mockReturnValue(createExecMock(demoUser));

      await expect(service.deleteUser(demoUser._id)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockUserModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should delete user and return success message', async () => {
      mockUserModel.findById.mockReturnValue(createExecMock(mockUser));
      mockUserModel.findByIdAndDelete.mockReturnValue(
        createQueryMock(mockUser),
      );

      const result = await service.deleteUser('507f1f77bcf86cd799439011');
      expect(result).toEqual({
        message: 'User deleted successfully',
        user: mockUser,
      });
    });
  });
});
