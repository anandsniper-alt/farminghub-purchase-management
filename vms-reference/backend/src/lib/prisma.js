import { PrismaClient } from '@prisma/client';
 
// Reuse a single PrismaClient across hot-reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis;
 
export const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
 
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
