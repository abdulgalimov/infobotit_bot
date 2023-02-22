import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserManager } from '../database/managers/user.manager';

@Injectable()
export class AuthService {
  constructor(
    private userManager: UserManager,
    private jwtService: JwtService,
  ) {}

  async login(user: any) {
    const payload = { userId: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
