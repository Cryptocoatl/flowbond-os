import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { clientsRouter }         from './routes/clients'
import { floweditSitesRouter }   from './routes/flowedit-sites'
import { floweditContentRouter } from './routes/flowedit-content'
import { floweditAiRouter }      from './routes/flowedit-ai'
import { floweditAuthRouter }    from './routes/flowedit-auth'
import { floweditInviteRouter }  from './routes/flowedit-invite'
import { floweditApproveRouter } from './routes/flowedit-approve'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok', service: 'flowbond-api', version: '0.1.0' }))

app.route('/api/v1/clients',          clientsRouter)
app.route('/api/v1/flowedit/auth',    floweditAuthRouter)
app.route('/api/v1/flowedit/auth/invite', floweditInviteRouter)
app.route('/api/v1/flowedit/sites',   floweditSitesRouter)
app.route('/api/v1/flowedit/content', floweditContentRouter)
app.route('/api/v1/flowedit/ai',      floweditAiRouter)
app.route('/api/v1/flowedit',         floweditApproveRouter)

const port = Number(process.env.PORT ?? 4000)

console.log(`FlowBond API running on port ${port}`)
serve({ fetch: app.fetch, port })

export default app
