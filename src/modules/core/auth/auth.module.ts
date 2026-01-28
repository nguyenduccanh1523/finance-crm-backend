import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { Role } from '../rbac/role.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { jwtConfig } from '../../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, Role]),
    JwtModule.register({
      secret: jwtConfig.accessSecret,
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
