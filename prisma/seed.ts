import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient();

const expenseCategories = [
  { slug: 'housing', name: 'Vivienda', icon: 'home', type: 'expense' },
  { slug: 'food', name: 'Alimentacion', icon: 'restaurant', type: 'expense' },
  { slug: 'transport', name: 'Transporte', icon: 'directions_car', type: 'expense' },
  { slug: 'entertainment', name: 'Entretenimiento', icon: 'movie', type: 'expense' },
  { slug: 'health', name: 'Salud', icon: 'local_hospital', type: 'expense' },
  { slug: 'debts', name: 'Deudas', icon: 'credit_card', type: 'expense' },
  { slug: 'subscriptions', name: 'Suscripciones', icon: 'autorenew', type: 'expense' },
  { slug: 'education', name: 'Educacion', icon: 'school', type: 'expense' },
  { slug: 'other_expense', name: 'Otros', icon: 'more_horiz', type: 'expense' },
];

const incomeCategories = [
  { slug: 'salary', name: 'Sueldo fijo', icon: 'payments', type: 'income' },
  { slug: 'freelance', name: 'Freelance', icon: 'work', type: 'income' },
  { slug: 'rent_income', name: 'Renta', icon: 'home_work', type: 'income' },
  { slug: 'investment', name: 'Inversiones', icon: 'trending_up', type: 'income' },
  { slug: 'other_income', name: 'Otros', icon: 'more_horiz', type: 'income' },
];

async function main() {
  const allCategories = [...expenseCategories, ...incomeCategories];

  for (const cat of allCategories) {
    await prisma.category.upsert({
      where: { slug_userId: { slug: cat.slug, userId: '' } },
      update: {},
      create: { ...cat, userId: null },
    });
  }

  console.log(`Seeded ${allCategories.length} base categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
