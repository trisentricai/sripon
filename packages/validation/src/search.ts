import { z } from 'zod'

export const SearchSchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  rating: z.number().min(1).max(5).optional(),
  inStock: z.boolean().optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest', 'popular']).default('relevance'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(50).default(20),
})
