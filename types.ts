// FIX: Replaced incorrect file content with proper type definitions for the application.

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserInput {
  landSize: string;
  location: string;
  soilType: string;
  irrigation: string;
  phoneNumber: string;
}

export type Locale = 'en' | 'hi' | 'kn' | 'te' | 'ta' | 'ml';

// FIX: Made uri and title optional to match the GroundingChunk type from the @google/genai SDK.
interface WebChunk {
  uri?: string;
  title?: string;
}

// FIX: Made uri and title optional to match the GroundingChunk type from the @google/genai SDK.
interface MapsChunk {
  uri?: string;
  title?: string;
}

export interface GroundingChunk {
  web?: WebChunk;
  maps?: MapsChunk;
}

export interface PestOrDisease {
    name: string;
    type: 'Pest' | 'Disease';
    symptoms: string;
    management: string[];
}

export interface FertilizerRecommendation {
    stage: string;
    fertilizer: string;
    dosage_per_acre: string;
    application_notes: string;
}

export interface SoilHealthRecommendation {
    practice: string;
    how_to: string[];
    benefit: string;
}

export interface SoilHealthAnalysis {
    assessment: string;
    recommendations_for_improvement: SoilHealthRecommendation[];
    organic_farming_link: string;
}

export interface CropAdvisory {
  suggested_crop_for_cultivation: string;
  why: {
    soil_suitability: string;
    crop_rotation: string;
    market_demand: string;
  };
  soil_health_analysis: SoilHealthAnalysis;
  time_to_complete_harvest: {
    duration_days_range: string;
    season_window: string;
    assumptions: string;
  };
  estimated_total_expense_for_user_land: {
    currency: string;
    amount: number;
    breakdown: {
      seeds: number;
      land_preparation: number;
      fertilizer_and_nutrients: number;
      irrigation_and_water: number;
      labor: number;
      pest_and_disease_control: number;
      harvesting_and_transport: number;
      miscellaneous: number;
    };
    unit_cost_basis: string;
    assumptions: string;
  };
  irrigation_schedule: {
    frequency: string;
    method: string;
    seasonal_adjustments: string;
    notes: string;
  };
  profitability_projection: {
    expected_yield: {
      value_range_per_acre: string;
      unit: string;
      assumptions: string;
    };
    farm_gate_price: {
      currency: string;
      price_per_quintal_assumed: number;
      assumptions: string;
    };
    gross_revenue_for_user_land: {
      currency: string;
      amount_range: string;
    };
    net_profit_for_user_land: {
      currency: string;
      amount_range: string;
    };
    roi_percentage_range: string;
  };
  pest_and_disease_management: PestOrDisease[];
  fertilizer_recommendations: FertilizerRecommendation[];
  recommended_marketplaces: Array<{
    name: string;
    type: string;
    region: string;
    why_suitable: string;
    phone_number?: string;
  }>;
  key_practices_for_success: string[];
  warnings_and_constraints: string[];
  data_gaps_and_assumptions: string[];
}

export interface AdvisoryResult {
  advisory: CropAdvisory;
  sources: GroundingChunk[];
}

// Weather Feature Types
export interface CurrentWeather {
  temperature: number;
  condition: string;
  icon: 'Sunny' | 'PartlyCloudy' | 'Cloudy' | 'Rain' | 'Thunderstorm' | 'Snow' | 'Windy';
}

export interface DailyForecast {
  day: string;
  high_temp: number;
  low_temp: number;
  condition: string;
  icon: 'Sunny' | 'PartlyCloudy' | 'Cloudy' | 'Rain' | 'Thunderstorm' | 'Snow' | 'Windy';
}

export interface WeatherForecast {
  current: CurrentWeather;
  daily: DailyForecast[];
}

// Feedback Feature Types
export interface Feedback {
  advisoryCrop: string;
  userInput: UserInput;
  rating: number;
  comments: string;
  submittedAt: string;
}