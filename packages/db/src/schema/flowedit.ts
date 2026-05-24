import { pgTable, pgEnum, text, integer, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core'

export const floweditApprovalModeEnum = pgEnum('flowedit_approval_mode', ['auto', 'review', 'admin_only'])
export const floweditStatusEnum = pgEnum('flowedit_status', ['draft', 'pending', 'approved', 'rejected', 'live'])
export const floweditTierEnum = pgEnum('flowedit_tier', ['simple', 'ai', 'agent'])
export const floweditRoleEnum = pgEnum('flowedit_role', ['viewer', 'editor', 'approver', 'admin'])

export const floweditSites = pgTable('flowedit_sites', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug:         text('slug').notNull().unique(),
  name:         text('name').notNull(),
  domain:       text('domain'),
  approvalMode: floweditApprovalModeEnum('approval_mode').notNull().default('review'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export const floweditChangeRequests = pgTable('flowedit_change_requests', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  siteId:      text('site_id').notNull().references(() => floweditSites.id, { onDelete: 'cascade' }),
  title:       text('title'),
  status:      floweditStatusEnum('status').notNull().default('draft'),
  githubPr:    text('github_pr'),
  previewUrl:  text('preview_url'),
  createdBy:   text('created_by'),
  reviewedBy:  text('reviewed_by'),
  reviewedAt:  timestamp('reviewed_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})

export const floweditContentOverrides = pgTable('flowedit_content_overrides', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  siteId:          text('site_id').notNull().references(() => floweditSites.id, { onDelete: 'cascade' }),
  changeRequestId: text('change_request_id'),  // FK to flowedit_change_requests handled at SQL level
  path:            text('path').notNull(),       // e.g. 'homepage/hero/title'
  field:           text('field').notNull(),      // 'text' | 'src' | 'href' | 'style' | 'alt'
  value:           jsonb('value').notNull(),     // { text: "..." } | { src: "...", alt: "..." } etc.
  status:          floweditStatusEnum('status').notNull().default('draft'),
  tier:            floweditTierEnum('tier').notNull().default('simple'),
  version:         integer('version').notNull().default(1),
  createdBy:       text('created_by'),
  approvedBy:      text('approved_by'),
  changeNote:      text('change_note'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  publishedAt:     timestamp('published_at'),
})

export const floweditSiteMembers = pgTable('flowedit_site_members', {
  siteId:    text('site_id').notNull().references(() => floweditSites.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull(),
  role:      floweditRoleEnum('role').notNull().default('editor'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.siteId, t.userId] })])

export type FloweditSite            = typeof floweditSites.$inferSelect
export type FloweditSiteInsert      = typeof floweditSites.$inferInsert
export type FloweditContentOverride = typeof floweditContentOverrides.$inferSelect
export type FloweditOverrideInsert  = typeof floweditContentOverrides.$inferInsert
export type FloweditChangeRequest   = typeof floweditChangeRequests.$inferSelect
export type FloweditSiteMember      = typeof floweditSiteMembers.$inferSelect
