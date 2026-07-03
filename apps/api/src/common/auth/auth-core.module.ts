import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';

/**
 * Global auth building blocks shared by the AuthModule (login/refresh) and
 * the JwtAuthGuard/PermissionsGuard applied app-wide. JwtService is used
 * with a per-call `secret` override (access vs refresh), so no default
 * secret is registered here.
 */
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  providers: [JwtStrategy, PasswordService],
  exports: [JwtModule, PasswordService],
})
export class AuthCoreModule {}
