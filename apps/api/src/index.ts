import { createServer } from './server'

async function main() {
  const app = await createServer() // Simplified server creation
  const port = parseInt(process.env.PORT || '3001')
  const host = process.env.HOST || 'localhost'
  await app.listen({ port, host })
  console.log(`Server running at http://${host}:${port}`)
}

main().catch(console.error)
