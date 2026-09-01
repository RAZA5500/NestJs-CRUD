import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from '../auth/dto/regiterUser.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email }).exec();
  }

  async createUser(registerUserDto: RegisterUserDto) {
    return await this.userModel.create({
      fName: registerUserDto.fName,
      lName: registerUserDto.lName,
      email: registerUserDto.email,
      password: registerUserDto.password,
    });
  }
}