import {
  pgTable,
  text,
  timestamp,
  jsonb,
  pgEnum,
  real,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'

// ─── Enums ─────────────────────────────────────────────────────────────────

export const sunExposureEnum = pgEnum('sun_exposure', ['full_sun', 'partial_shade', 'full_shade'])
export const irrigationTypeEnum = pgEnum('irrigation_type', ['drip', 'sprinkler', 'hand', 'none'])
export const soilTypeEnum = pgEnum('soil_type', ['loam', 'clay', 'sandy', 'hugelkultur', 'compost', 'mixed'])

export const plantTypeEnum = pgEnum('plant_type', [
  'vegetable', 'herb', 'flower', 'fruit', 'tree', 'companion', 'cover_crop', 'other',
])
export const plantStatusEnum = pgEnum('plant_status', [
  'seed', 'sprout', 'seedling', 'growing', 'flowering', 'fruiting', 'harvested', 'dead',
])

export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'done', 'skipped'])
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent'])

export const deviceTypeEnum = pgEnum('device_type', [
  'raspberry_pi', 'soil_sensor', 'camera', 'weather_station',
  'water_flow_meter', 'water_level_sensor', 'valve_controller',
])
export const deviceStatusEnum = pgEnum('device_status', ['offline', 'online', 'warning', 'error'])

export const readingTypeEnum = pgEnum('reading_type', [
  'soil_moisture', 'temperature', 'humidity', 'light', 'ph', 'ec', 'water_level', 'water_flow',
])
export const readingSourceEnum = pgEnum('reading_source', ['manual', 'raspberry_pi', 'api', 'mock'])

export const triggerTypeEnum = pgEnum('trigger_type', [
  'soil_moisture_below', 'schedule', 'weather_condition', 'manual',
])
export const actionTypeEnum = pgEnum('action_type', [
  'notify', 'create_task', 'open_valve', 'close_valve', 'ai_review',
])

// ─── Garden Zones / Beds ────────────────────────────────────────────────────

export const gardenZones = pgTable('garden_zones', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  // FlowBond identity placeholders
  userId: text('user_id'),
  gardenId: text('garden_id'),
  householdId: text('household_id'),

  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  locationNotes: text('location_notes'),
  widthM: real('width_m'),
  lengthM: real('length_m'),
  sunExposure: sunExposureEnum('sun_exposure'),
  soilType: soilTypeEnum('soil_type'),
  irrigationType: irrigationTypeEnum('irrigation_type'),
  notes: text('notes'),
  photoUrls: jsonb('photo_urls').$type<string[]>().default([]),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Plants ─────────────────────────────────────────────────────────────────

export const plants = pgTable('plants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  gardenId: text('garden_id'),
  zoneId: text('zone_id').references(() => gardenZones.id, { onDelete: 'set null' }),

  name: text('name').notNull(),
  variety: text('variety'),
  type: plantTypeEnum('type').notNull().default('vegetable'),
  status: plantStatusEnum('status').notNull().default('seed'),

  plantedDate: timestamp('planted_date'),
  germinationDate: timestamp('germination_date'),
  expectedHarvestDate: timestamp('expected_harvest_date'),

  depthCm: real('depth_cm'),
  spacingCm: real('spacing_cm'),
  quantity: integer('quantity').default(1),

  notes: text('notes'),
  photoUrls: jsonb('photo_urls').$type<string[]>().default([]),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Journal Entries ─────────────────────────────────────────────────────────

export const journalEntries = pgTable('journal_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  gardenId: text('garden_id'),
  zoneId: text('zone_id').references(() => gardenZones.id, { onDelete: 'set null' }),

  entryDate: timestamp('entry_date').notNull().defaultNow(),
  title: text('title'),
  content: text('content').notNull(),

  weatherCondition: text('weather_condition'),
  temperatureC: real('temperature_c'),
  humidityPct: real('humidity_pct'),

  watered: boolean('watered').default(false),
  compostAdded: boolean('compost_added').default(false),
  pestsObserved: boolean('pests_observed').default(false),
  pestNotes: text('pest_notes'),

  photoUrls: jsonb('photo_urls').$type<string[]>().default([]),
  tags: jsonb('tags').$type<string[]>().default([]),
  // Future: AI summary of this entry
  aiSummary: text('ai_summary'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Tasks / Missions ────────────────────────────────────────────────────────

export const gardenTasks = pgTable('garden_tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  gardenId: text('garden_id'),
  zoneId: text('zone_id').references(() => gardenZones.id, { onDelete: 'set null' }),
  plantId: text('plant_id').references(() => plants.id, { onDelete: 'set null' }),

  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date'),

  // Gamification placeholder
  rewardPoints: integer('reward_points').default(0),
  proofRequired: boolean('proof_required').default(false),
  proofPhotoUrl: text('proof_photo_url'),
  completedAt: timestamp('completed_at'),

  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Hardware Devices ────────────────────────────────────────────────────────

export const devices = pgTable('devices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  gardenId: text('garden_id'),
  zoneId: text('zone_id').references(() => gardenZones.id, { onDelete: 'set null' }),

  name: text('name').notNull(),
  type: deviceTypeEnum('type').notNull(),
  status: deviceStatusEnum('status').notNull().default('offline'),
  firmwareVersion: text('firmware_version'),
  lastSeenAt: timestamp('last_seen_at'),

  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Sensor Readings ─────────────────────────────────────────────────────────

export const sensorReadings = pgTable('sensor_readings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text('device_id').references(() => devices.id, { onDelete: 'cascade' }),
  zoneId: text('zone_id').references(() => gardenZones.id, { onDelete: 'set null' }),

  readingType: readingTypeEnum('reading_type').notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  source: readingSourceEnum('source').notNull().default('manual'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),

  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Camera Captures ─────────────────────────────────────────────────────────

export const cameraCaptures = pgTable('camera_captures', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text('device_id').references(() => devices.id, { onDelete: 'set null' }),
  zoneId: text('zone_id').references(() => gardenZones.id, { onDelete: 'set null' }),

  imageUrl: text('image_url').notNull(),
  capturedAt: timestamp('captured_at').notNull().defaultNow(),
  source: readingSourceEnum('source').notNull().default('manual'),

  // Future: AI analysis results
  futureAiAnalysis: jsonb('future_ai_analysis'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Automation Rules ─────────────────────────────────────────────────────────

export const automationRules = pgTable('automation_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  gardenId: text('garden_id'),

  name: text('name').notNull(),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  condition: jsonb('condition').notNull(),
  actionType: actionTypeEnum('action_type').notNull(),
  actionConfig: jsonb('action_config').notNull(),
  enabled: boolean('enabled').notNull().default(true),

  lastTriggeredAt: timestamp('last_triggered_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
