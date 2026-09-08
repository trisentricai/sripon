// Database configuration and Prisma client setup
import { PrismaClient } from '@prisma/client'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const prismaClientPath = require.resolve('@prisma/client')

// Singleton Prisma client
let prisma: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (prisma) return prisma

  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'colorless',
  })

  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

export function getDbUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://localhost:5432/ecommerce'
}