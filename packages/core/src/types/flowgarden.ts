// ─── Garden Zones ────────────────────────────────────────────────────────────

export type SunExposure = 'full_sun' | 'partial_shade' | 'full_shade'
export type IrrigationType = 'drip' | 'sprinkler' | 'hand' | 'none'
export type SoilType = 'loam' | 'clay' | 'sandy' | 'hugelkultur' | 'compost' | 'mixed'

export interface GardenZone {
  id: string
  userId?: string
  gardenId?: string
  householdId?: string
  name: string
  slug: string
  description?: string
  locationNotes?: string
  widthM?: number
  lengthM?: number
  sunExposure?: SunExposure
  soilType?: SoilType
  irrigationType?: IrrigationType
  notes?: string
  photoUrls: string[]
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CreateGardenZoneInput {
  name: string
  slug: string
  description?: string
  locationNotes?: string
  widthM?: number
  lengthM?: number
  sunExposure?: SunExposure
  soilType?: SoilType
  irrigationType?: IrrigationType
  notes?: string
}

// ─── Plants ──────────────────────────────────────────────────────────────────

export type PlantType = 'vegetable' | 'herb' | 'flower' | 'fruit' | 'tree' | 'companion' | 'cover_crop' | 'other'
export type PlantStatus = 'seed' | 'sprout' | 'seedling' | 'growing' | 'flowering' | 'fruiting' | 'harvested' | 'dead'

export interface Plant {
  id: string
  userId?: string
  gardenId?: string
  zoneId?: string
  name: string
  variety?: string
  type: PlantType
  status: PlantStatus
  plantedDate?: Date
  germinationDate?: Date
  expectedHarvestDate?: Date
  depthCm?: number
  spacingCm?: number
  quantity: number
  notes?: string
  photoUrls: string[]
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CreatePlantInput {
  zoneId?: string
  name: string
  variety?: string
  type: PlantType
  status?: PlantStatus
  plantedDate?: Date
  quantity?: number
  notes?: string
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string
  userId?: string
  gardenId?: string
  zoneId?: string
  entryDate: Date
  title?: string
  content: string
  weatherCondition?: string
  temperatureC?: number
  humidityPct?: number
  watered: boolean
  compostAdded: boolean
  pestsObserved: boolean
  pestNotes?: string
  photoUrls: string[]
  tags: string[]
  aiSummary?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CreateJournalEntryInput {
  zoneId?: string
  title?: string
  content: string
  entryDate?: Date
  weatherCondition?: string
  temperatureC?: number
  humidityPct?: number
  watered?: boolean
  compostAdded?: boolean
  pestsObserved?: boolean
  pestNotes?: string
  tags?: string[]
}

// ─── Tasks / Missions ────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface GardenTask {
  id: string
  userId?: string
  gardenId?: string
  zoneId?: string
  plantId?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: Date
  rewardPoints: number
  proofRequired: boolean
  proofPhotoUrl?: string
  completedAt?: Date
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CreateGardenTaskInput {
  zoneId?: string
  plantId?: string
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: Date
  rewardPoints?: number
  proofRequired?: boolean
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export type DeviceType =
  | 'raspberry_pi'
  | 'soil_sensor'
  | 'camera'
  | 'weather_station'
  | 'water_flow_meter'
  | 'water_level_sensor'
  | 'valve_controller'

export type DeviceStatus = 'offline' | 'online' | 'warning' | 'error'

export interface Device {
  id: string
  userId?: string
  gardenId?: string
  zoneId?: string
  name: string
  type: DeviceType
  status: DeviceStatus
  firmwareVersion?: string
  lastSeenAt?: Date
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// ─── Sensor Readings ─────────────────────────────────────────────────────────

export type ReadingType = 'soil_moisture' | 'temperature' | 'humidity' | 'light' | 'ph' | 'ec' | 'water_level' | 'water_flow'
export type ReadingSource = 'manual' | 'raspberry_pi' | 'api' | 'mock'

export interface SensorReading {
  id: string
  deviceId?: string
  zoneId?: string
  readingType: ReadingType
  value: number
  unit: string
  source: ReadingSource
  recordedAt: Date
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface IngestSensorPayload {
  device_id: string
  garden_zone_id?: string
  readings: Array<{
    type: ReadingType
    value: number
    unit: string
  }>
  recorded_at: string
  source: ReadingSource
}

// ─── Camera Captures ─────────────────────────────────────────────────────────

export interface CameraCapture {
  id: string
  deviceId?: string
  zoneId?: string
  imageUrl: string
  capturedAt: Date
  source: ReadingSource
  futureAiAnalysis?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdAt: Date
}

// ─── Automation Rules ────────────────────────────────────────────────────────

export type TriggerType = 'soil_moisture_below' | 'schedule' | 'weather_condition' | 'manual'
export type ActionType = 'notify' | 'create_task' | 'open_valve' | 'close_valve' | 'ai_review'

export interface AutomationRule {
  id: string
  userId?: string
  gardenId?: string
  name: string
  triggerType: TriggerType
  condition: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
  enabled: boolean
  lastTriggeredAt?: Date
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// ─── Dashboard Overview ───────────────────────────────────────────────────────

export interface GardenOverview {
  totalZones: number
  totalPlants: number
  tasksToday: number
  pendingTasks: number
  devicesOnline: number
  devicesTotal: number
  recentPhotos: string[]
  latestReadings: Array<{
    type: ReadingType
    value: number
    unit: string
    zoneId?: string
    zoneName?: string
    recordedAt: Date
    source: ReadingSource
  }>
}

// ─── AI Interface Stubs ───────────────────────────────────────────────────────

export interface GardenAISummary {
  summary: string
  healthScore: number
  recommendations: string[]
  generatedAt: Date
}

export interface PlantDiagnosis {
  plantId: string
  issue?: string
  confidence: number
  suggestions: string[]
  generatedAt: Date
}

export interface WateringRecommendation {
  zoneId: string
  shouldWater: boolean
  recommendedAmountL?: number
  reason: string
  generatedAt: Date
}
