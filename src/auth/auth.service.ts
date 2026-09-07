import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { RegisterUserDto } from './dto/regiterUser.dto.js';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoginUserDto } from './dto/loginUser.dto.js';
import { Role } from '../user/user.types.js';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refreshToken.schema.js';
import {
  getRefreshTokenSecret,
  hashRefreshToken,
  newRefreshTokenId,
  REFRESH_TOKEN_TTL,
  REFRESH_TOKEN_TTL_MS,
  REFRESH_TOKEN_TYPE,
} from './token.constants.js';

/** The account fields a token pair is minted from. */
type TokenSubject = {
  _id: Types.ObjectId | string;
  email: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    const { fName, lName, email, password } = registerUserDto;

    if (!fName || !lName || !email || !password) {
      throw new BadRequestException(
        'Must fill the required fields (fName, lName, email, & password)',
      );
    }

    const saltRounds = 10;
    const hashPwd = await bcrypt.hash(password, saltRounds);

    const user = await this.userService.createUser({
      ...registerUserDto,
      password: hashPwd,
      role: Role.Admin,
    });

    return {
      id: user._id,
      firstName: fName,
      lastName: lName,
      email: user.email,
      message: 'Signup succesfull',
    };
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userService.loginUser({
      email,
      password: ''
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      ...(await this.issueTokens(user)),
      role: user.role,
      message: 'Login successfully',
    };
  }

  /**
   * Swaps a refresh token for a brand new pair. The old token is consumed by
   * this call (rotation), so replaying one — a stolen copy, or the browser
   * retrying — is rejected instead of handing out a second live session.
   */
  async refreshTokens(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const stored = await this.refreshTokenModel
      .findOneAndDelete({ tokenHash: hashRefreshToken(refreshToken) })
      .exec();

    if (!stored) {
      throw new UnauthorizedException(
        'Refresh token is no longer valid, please sign in again',
      );
    }

    // The account can have been deleted (or its id gone stale) while the
    // refresh token was still within its 20 days.
    const user = await this.userService
      .getUserById(payload.sub)
      .catch(() => null);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...(await this.issueTokens(user)),
      role: user.role,
      message: 'Token refreshed successfully',
    };
  }

  /**
   * Drops the refresh token's row so it can never be redeemed again. Signing
   * out is idempotent: an unknown or already-expired token is not an error.
   */
  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokenModel
        .deleteOne({ tokenHash: hashRefreshToken(refreshToken) })
        .exec();
    }

    return { message: 'Logged out successfully' };
  }

  /** Mints an access + refresh pair and records the refresh token's hash. */
  private async issueTokens(user: TokenSubject) {
    const userId = user._id.toString();

    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: REFRESH_TOKEN_TYPE, jti: newRefreshTokenId() },
      {
        secret: getRefreshTokenSecret(),
        expiresIn: REFRESH_TOKEN_TTL,
      },
    );

    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /** Signature, expiry and "this really is a refresh token" checks. */
  private async verifyRefreshToken(refreshToken: string) {
    let payload: { sub?: string; type?: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // An access token is signed with the same shape; only the refresh flow may
    // mint new credentials, so reject anything that is not marked as one.
    if (payload?.type !== REFRESH_TOKEN_TYPE || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload as { sub: string; type: string };
  }
}
