import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
import * as cacheManager from 'cache-manager';
import { MailService } from '../mailer/mail.service';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly OTP_TTL = 300;
  private readonly VERIFIED_TTL = 1800;
  private readonly MAX_RESEND = 5;
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly jwtService: JwtService,

    // ⬇️🔥 Thêm Redis (CacheManager)
    @Inject(CACHE_MANAGER) private readonly cacheManager: cacheManager.Cache,

    // ⬇️🔥 Thêm MailService
    private readonly mailService: MailService,
  ) {}

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestOtp(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    // Email đã tồn tại → không cho đăng ký nữa
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Email already registered');

    const otpKey = `verify:email:${email}`;
    const countKey = `otp:count:${email}`;

    // ✅ Nếu OTP hiện tại vẫn còn trong Redis → không tạo OTP mới tránh spam
    const existingOtp = await this.cacheManager.get(otpKey);
    if (existingOtp) {
      throw new BadRequestException(
        'Mã OTP hiện tại vẫn còn hiệu lực, vui lòng kiểm tra lại email.',
      );
    }

    // Tạo OTP mới
    const otp = this.generateOTP();

    // Lưu OTP với TTL 5 phút
    await this.cacheManager.set(otpKey, otp, this.OTP_TTL * 1000);

    // Reset số lần resend về 0
    await this.cacheManager.set(countKey, 0, 3600 * 1000);

    // Gửi mail OTP (template đẹp sẽ sửa trong MailService)
    await this.mailService.sendOtp(email, otp);

    return { message: 'OTP đã được gửi đến email của bạn.' };
  }

  // ✅ HÀM MỚI: Resend OTP khi đã hết hạn, có limit số lần
  async resendOtp(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const otpKey = `verify:email:${email}`;
    const countKey = `otp:count:${email}`;

    // Nếu vẫn còn OTP cũ → không cho resend
    const currentOtp = await this.cacheManager.get(otpKey);
    if (currentOtp) {
      throw new BadRequestException(
        'Mã OTP hiện tại vẫn còn hiệu lực, vui lòng dùng mã đã gửi trước đó.',
      );
    }

    // Kiểm tra số lần resend
    let count = await this.cacheManager.get(countKey);
    const currentCount = Number(count || 0);

    if (currentCount >= this.MAX_RESEND) {
      throw new BadRequestException(
        'Bạn đã yêu cầu gửi lại OTP quá số lần cho phép. Vui lòng thử lại sau.',
      );
    }

    // Tạo OTP mới
    const otp = this.generateOTP();

    // Lưu OTP mới
    await this.cacheManager.set(otpKey, otp, this.OTP_TTL * 1000);

    // Tăng số lần resend
    await this.cacheManager.set(countKey, currentCount + 1, 3600 * 1000);

    // Gửi mail OTP
    await this.mailService.sendOtp(email, otp);

    return {
      message: 'OTP mới đã được gửi đến email của bạn.',
      resendCount: currentCount + 1,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const otpKey = `verify:email:${email}`;
    const verifiedKey = `verified:email:${email}`;

    const cachedOtp = await this.cacheManager.get(otpKey);
    if (!cachedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (cachedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Lưu flag đã xác thực
    await this.cacheManager.set(verifiedKey, 'true', this.VERIFIED_TTL * 1000);

    // Xóa OTP để tránh dùng lại
    await this.cacheManager.del(otpKey);

    return { message: 'Email verified. You can now register.' };
  }

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
    const { email } = dto;
    const verifiedKey = `verified:email:${email}`;

    // Bắt buộc phải verify email trước
    const isVerified = await this.cacheManager.get(verifiedKey);
    if (!isVerified) {
      throw new BadRequestException('Please verify your email first.');
    }

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

    // ✅ Xoá flag verified để tránh reuse
    await this.cacheManager.del(verifiedKey);

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
