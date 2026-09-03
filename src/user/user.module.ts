import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema.js';
import { UserController } from './user.controller.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService, AuthGuard],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
