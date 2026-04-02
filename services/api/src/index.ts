import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { clientsRouter } from './routes/clients'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
}))

app.get('/health', (c) => c.json({ status: 'ok', service: 'flowbond-api', version: '0.1.0' }))

app.route('/api/v1/clients', clientsRouter)

const port = Number(process.env.PORT ?? 4000)

console.log(`FlowBond API running on port ${port}`)
serve({ fetch: app.fetch, port })

export default app
