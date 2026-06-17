import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const users: any[] = [];
const accounts: any[] = [];
const transactions: any[] = [];
const categories: any[] = [
  { id: 'cat-food', slug: 'food', name: 'Alimentacion', icon: 'restaurant', type: 'expense', userId: null },
  { id: 'cat-salary', slug: 'salary', name: 'Sueldo fijo', icon: 'payments', type: 'income', userId: null },
];

let idCounter = 0;
const genId = () => `id-${++idCounter}`;

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn().mockImplementation(async (calls: any[]) => {
    const results = [];
    for (const call of calls) results.push(await call);
    return results;
  }),
  user: {
    findUnique: jest.fn().mockImplementation(({ where }: any) =>
      users.find((u) => u.email === where.email || u.id === where.id) ?? null,
    ),
    create: jest.fn().mockImplementation(({ data }: any) => {
      const user = { id: genId(), ...data, createdAt: new Date(), updatedAt: new Date() };
      users.push(user);
      return user;
    }),
  },
  account: {
    findMany: jest.fn().mockImplementation(({ where }: any) =>
      accounts.filter((a) => a.userId === where?.userId),
    ),
    findFirst: jest.fn().mockImplementation(({ where }: any) =>
      accounts.find((a) => a.id === where.id && a.userId === where.userId) ?? null,
    ),
    create: jest.fn().mockImplementation(({ data }: any) => {
      const account = { id: genId(), balance: 0, ...data, createdAt: new Date(), updatedAt: new Date() };
      accounts.push(account);
      return account;
    }),
    update: jest.fn().mockImplementation(({ where, data }: any) => {
      const acc = accounts.find((a: any) => a.id === where.id);
      if (acc && data.balance?.increment) acc.balance += data.balance.increment;
      return acc;
    }),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  transaction: {
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      let result = transactions.filter((t: any) => t.userId === where?.userId);
      if (where?.type) result = result.filter((t: any) => t.type === where.type);
      return result.map((t: any) => ({
        ...t,
        category: categories.find((c) => c.id === t.categoryId),
        account: accounts.find((a) => a.id === t.accountId),
      }));
    }),
    findFirst: jest.fn(),
    create: jest.fn().mockImplementation(({ data, include }: any) => {
      const tx = { id: genId(), ...data, createdAt: new Date(), updatedAt: new Date() };
      transactions.push(tx);
      const result: any = { ...tx };
      if (include?.category) result.category = categories.find((c) => c.id === tx.categoryId);
      if (include?.account) result.account = accounts.find((a) => a.id === tx.accountId);
      return result;
    }),
    count: jest.fn().mockImplementation(({ where }: any) =>
      transactions.filter((t: any) => t.userId === where?.userId).length,
    ),
    groupBy: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    update: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findMany: jest.fn().mockImplementation(() => categories),
    findFirst: jest.fn(),
  },
  incomeSource: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  budget: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  savingsGoal: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  notification: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
};

describe('Full Flow (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register — register user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'e2e@test.com', password: 'password123', name: 'E2E User' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('userId');
    authToken = res.body.accessToken;
  });

  it('POST /auth/login — login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'password123' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    authToken = res.body.accessToken;
  });

  it('POST /accounts — create account', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Banco E2E', type: 'bank' })
      .expect(201);

    expect(res.body.name).toBe('Banco E2E');
    expect(res.body.balance).toBe(0);
  });

  it('GET /accounts — list accounts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /transactions — create transaction & update balance', async () => {
    const accountId = accounts[0].id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'expense',
        amount: 5000,
        date: '2026-06-15T00:00:00.000Z',
        accountId,
        categoryId: 'cat-food',
      })
      .expect(201);

    expect(res.body.amount).toBe(5000);
    expect(res.body.type).toBe('expense');

    // Verify balance was updated
    const updatedAccount = accounts.find((a) => a.id === accountId);
    expect(updatedAccount.balance).toBe(-5000);
  });

  it('GET /transactions — paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta.page).toBe(1);
  });

  it('GET /analytics/spending-by-category — analytics', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/spending-by-category?startDate=2026-01-01&endDate=2026-12-31')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/accounts')
      .expect(401);
  });

  it('POST /auth/register — rejects invalid input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: '12' })
      .expect(400);
  });
});
