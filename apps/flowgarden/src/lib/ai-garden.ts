import type {
  GardenAISummary, PlantDiagnosis, WateringRecommendation,
} from '@flowbond/core'

// Stubs — swap for real Anthropic calls when ANTHROPIC_API_KEY is set.

export async function generateGardenSummary(gardenId?: string): Promise<GardenAISummary> {
  return {
    summary: 'Your garden is in good health. The main veggie bed is producing well. Watch for aphids on basil and monitor tomatoes for early blight signs. Compost pile 1 is active and producing good microbial heat.',
    healthScore: 78,
    recommendations: [
      'Water main bed today — soil moisture is at 42%, slightly low for tomatoes.',
      'Apply neem oil preventatively to basil and tomatoes this week.',
      'Lemon tree yellowing may indicate magnesium deficiency — test soil and consider foliar spray.',
    ],
    generatedAt: new Date(),
  }
}

export async function analyzePlantPhoto(
  photoUrl: string,
  plantId: string,
): Promise<PlantDiagnosis> {
  return {
    plantId,
    issue: undefined,
    confidence: 0,
    suggestions: ['Upload a clear photo to enable AI plant diagnosis. Make sure the photo is well-lit and shows the full plant or affected area.'],
    generatedAt: new Date(),
  }
}

export async function suggestWateringTasks(zoneId: string): Promise<WateringRecommendation> {
  return {
    zoneId,
    shouldWater: true,
    recommendedAmountL: 8,
    reason: 'Soil moisture is below 45% and no rain is forecast in the next 48 hours. Tomatoes and cucumbers need consistent moisture to prevent blossom end rot.',
    generatedAt: new Date(),
  }
}

export async function detectPestRisk(zoneId: string): Promise<{ risk: string; notes: string }> {
  return {
    risk: 'medium',
    notes: 'Aphid activity was noted on basil 2 days ago. Monitor companion plants and consider introducing ladybugs or applying diluted neem oil spray early morning.',
  }
}
