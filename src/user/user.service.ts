import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterUserDto } from '../auth/dto/regiterUser.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginUserDto } from '../auth/dto/loginUser.dto.js';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // async findByEmail(email: string): Promise<UserDocument | null> {
  //   return await this.userModel.findOne({ email }).exec();
  // }

  async createUser(registerUserDto: RegisterUserDto) {
    try {
      return await this.userModel.create({
        fName: registerUserDto.fName,
        lName: registerUserDto.lName,
        email: registerUserDto.email,
        password: registerUserDto.password,
      });
    } catch (err : unknown) {
      const e = err as { code?: number }

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
}