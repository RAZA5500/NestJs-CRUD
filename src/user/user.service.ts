import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from '../auth/dto/regiterUser.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { LoginUserDto } from '../auth/dto/loginUser.dto.js';
import { UpdateUserDto } from './dto/updateUser.dto.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // async findByEmail(email: string): Promise<UserDocument | null> {
  //   return await this.userModel.findOne({ email }).exec();
  // }

  async createUser(
    registerUserDto: RegisterUserDto & {
      role?: string;
      mustChangePassword?: boolean;
    },
  ) {
    try {
      return await this.userModel.create({
        fName: registerUserDto.fName,
        lName: registerUserDto.lName,
        email: registerUserDto.email,
        password: registerUserDto.password,
        ...(registerUserDto.role ? { role: registerUserDto.role } : {}),
        ...(registerUserDto.mustChangePassword
          ? { mustChangePassword: true }
          : {}),
      });
    } catch (err: unknown) {
      const e = err as { code?: number };

      if (e.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }

      throw err;
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    try {
      return await this.userModel.findOne({
        email: loginUserDto.email,
      });
    } catch (err) {
      console.log(err);
    }
  }

  async getAllUsers() {
    return await this.userModel.find().select('-password').exec();
  }

  async getUserById(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const { currentPassword, ...updateData } = updateUserDto;

    if (updateData.password) {
      if (currentPassword) {
        const existingUser = await this.userModel.findById(id).exec();
        if (!existingUser) {
          throw new NotFoundException('User not found');
        }
        const isMatch = await bcrypt.compare(
          currentPassword,
          existingUser.password,
        );
        if (!isMatch) {
          throw new UnauthorizedException('Current password is incorrect');
        }
      }

      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
      updateData.mustChangePassword = false;
    }

    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .select('-password')
        .exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'User updated successfully',
        user: updatedUser,
      };
    } catch (err: unknown) {
      const e = err as { code?: number };

      if (e.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }

      throw err;
    }
  }

  async deleteUser(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const deletedUser = await this.userModel
      .findByIdAndDelete(id)
      .select('-password')
      .exec();

    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User deleted successfully',
      user: deletedUser,
    };
  }
}