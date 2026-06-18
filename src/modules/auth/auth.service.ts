import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';

const DEFAULT_CATEGORIES = [
  { slug: 'housing', name: 'Vivienda', icon: 'home', type: 'expense' },
  { slug: 'food', name: 'Alimentacion', icon: 'restaurant', type: 'expense' },
  { slug: 'transport', name: 'Transporte', icon: 'directions_car', type: 'expense' },
  { slug: 'entertainment', name: 'Entretenimiento', icon: 'movie', type: 'expense' },
  { slug: 'health', name: 'Salud', icon: 'local_hospital', type: 'expense' },
  { slug: 'debts', name: 'Deudas', icon: 'credit_card', type: 'expense' },
  { slug: 'subscriptions', name: 'Suscripciones', icon: 'autorenew', type: 'expense' },
  { slug: 'education', name: 'Educacion', icon: 'school', type: 'expense' },
  { slug: 'other_expense', name: 'Otros', icon: 'more_horiz', type: 'expense' },
  { slug: 'salary', name: 'Sueldo fijo', icon: 'payments', type: 'income' },
  { slug: 'freelance', name: 'Freelance', icon: 'work', type: 'income' },
  { slug: 'rent_income', name: 'Renta', icon: 'home_work', type: 'income' },
  { slug: 'investment', name: 'Inversiones', icon: 'trending_up', type: 'income' },
  { slug: 'other_income', name: 'Otros', icon: 'more_horiz', type: 'income' },
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    });

    // Asignar categorías por defecto al nuevo usuario (propias y editables).
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
    });

    return this.buildTokenResponse(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildTokenResponse(user.id, user.email);
  }

  private buildTokenResponse(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload),
      userId,
    };
  }
}
