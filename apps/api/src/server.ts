import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodType } from 'zod'
import { supabaseClient } from '@ecommerce/config/src/supabase'

export function createServer(app: FastifyInstance) {
  // Auth middleware
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization || ''
      const token = authHeader.replace('Bearer ', '')
      if (!token) throw new Error('No token')
      // In production: verify with Supabase
      const { data, error } = await supabaseClient.auth.getUser(token)
      if (error || !data.user) throw new Error('Invalid token')
      (request as any).user = data.user
    } catch (error) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid or expired token',
        },
      })
    }
  }

  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    if (request.user?.role !== 'admin' && request.user?.role !== 'super_admin') {
      reply.status(403).send({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Admin access required',
        },
      })
    }
  }

  // Validation helper
  const validate = <T>(schema: ZodType<T>, data: unknown) => {
    try {
      return schema.parse(data)
    } catch (error) {
      throw error // Let Fastify error handler deal with ZodError
    }
  }

  // Success response helper
  const success = <T>(data?: T, message?: string) => {
    return { success: true as const, data, message }
  }

  // Error response helper
  const error = (code: string, message: string) => {
    return { success: false as const, error: { code, message } }
  }

  // Health check
  app.get('/health', async () => {
    return { success: true, data: { status: 'ok' } }
  })

  // Auth routes
  app.post('/auth/login', async (request, reply) => {
    // TODO: Implement login with Supabase
    return success(null, 'Login endpoint')
  })

  app.post('/auth/logout', async (request, reply) => {
    return success(null, 'Logout endpoint')
  })

  // Product routes
  app.get('/products', async (request, reply) => {
    // TODO: Implement get products
    return success([])
  })

  app.get('/products/:id', async (request, reply) => {
    // TODO: Implement get product by id
    return success(null)
  })

  // Admin routes
  app.get('/admin/products', { preHandler: requireAdmin }, async (request, reply) => {
    // TODO: Implement admin get products
    return success([])
  })

  // Categories routes
  app.get('/categories', async (request, reply) => {
    // TODO: Implement get categories
    return success([])
  })

  // Cart routes
  app.get('/cart', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement get cart
    return success(null)
  })

  app.post('/cart/items', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement add to cart
    return success(null)
  })

  // Order routes
  app.get('/orders', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement get orders
    return success([])
  })

  app.post('/orders', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement create order
    return success(null)
  })

  return app
}