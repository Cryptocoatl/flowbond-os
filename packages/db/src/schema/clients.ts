import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const clientStatusEnum = pgEnum('client_status', ['active', 'inactive', 'suspended'])

export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  status: clientStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
