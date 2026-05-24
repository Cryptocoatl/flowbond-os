import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { clientsRouter }         from './routes/clients'
import { floweditSitesRouter }   from './routes/flowedit-sites'
import { floweditContentRouter } from './routes/flowedit-content'
import { floweditAiRouter }      from './routes/flowedit-ai'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
}))

app.get('/health', (c) => c.json({ status: 'ok', service: 'flowbond-api', version: '0.1.0' }))

app.route('/api/v1/clients',          clientsRouter)
app.route('/api/v1/flowedit/sites',   floweditSitesRouter)
app.route('/api/v1/flowedit/content', floweditContentRouter)
app.route('/api/v1/flowedit/ai',      floweditAiRouter)

const port = Number(process.env.PORT ?? 4000)

console.log(`FlowBond API running on port ${port}`)
serve({ fetch: app.fetch, port })

export default app
