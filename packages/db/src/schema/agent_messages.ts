import { pgTable, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const channelEnum = pgEnum('channel', ['whatsapp', 'telegram', 'web'])

export const agentMessages = pgTable('agent_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel: channelEnum('channel').notNull(),
  from: text('from').notNull(),
  text: text('text').notNull(),
  intent: text('intent'),
  response: text('response'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
