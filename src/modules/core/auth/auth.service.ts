import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { jwtConfig } from '../../../config/jwt.config';
import { InvalidCredentialsException } from '../../../common/exceptions/auth-exceptions';
import { Role } from '../rbac/role.entity';
import { RegisterDto } from './dto/register.dto';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new InvalidCredentialsException();
    }
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new InvalidCredentialsException();
    }
    if (user.status !== 1) {
      throw new ForbiddenException('Tài khoản đã bị khoá');
    }
    return user;
  }

  private async getUserGlobalRoles(userId: string): Promise<string[]> {
    // Ở đây đơn giản là query xem user này có phải SUPER_ADMIN không.
    // Tuỳ design của bạn, có thể có bảng user_global_roles riêng.
    // Tạm thời: nếu email = SEED_ADMIN_EMAIL => SUPER_ADMIN
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];
    if (user.email === process.env.SEED_ADMIN_EMAIL) {
      return ['SUPER_ADMIN'];
    }
    return [];
  }

  private async signTokens(user: User) {
    const globalRoles = await this.getUserGlobalRoles(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: globalRoles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn,
    });

    // Lưu refresh token (nên lưu HASH)
    const hash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // approx 30d

    const rt = this.refreshTokenRepo.create({
      userId: user.id,
      token: hash,
      expiresAt,
      userAgent: null,
      ipAddress: null,
    });
    await this.refreshTokenRepo.save(rt);

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash: hash,
      fullName: dto.fullName,
      status: 1,
      timezone: 'Asia/Ho_Chi_Minh',
      defaultCurrency: 'VND',
    });

    await this.userRepo.save(user);
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const tokens = await this.signTokens(user);
    return { user, ...tokens };
  }

  async refresh(refreshTokenRaw: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenRaw, {
        secret: jwtConfig.refreshSecret,
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check DB refresh token
      const tokens = await this.refreshTokenRepo.find({
        where: { userId: user.id, revokedAt: IsNull() },
      });

      let matched = false;
      for (const t of tokens) {
        const ok = await bcrypt.compare(refreshTokenRaw, t.token);
        if (ok && (!t.expiresAt || t.expiresAt > new Date())) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        throw new UnauthorizedException('Refresh token invalid');
      }

      // Rotate token
      const { accessToken, refreshToken } = await this.signTokens(user);
      return { user, accessToken, refreshToken };
    } catch (e) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
  }

  async logout(userId: string) {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
