
export interface UserInput {
  landSize: string;
  location: string;
  soilType: string;
  irrigation: string;
}

export interface CropAdvisory {
  suggested_crop_for_cultivation: string;
  why: {
    soil_suitability: string;
    crop_rotation: string;
    market_demand: string;
  };
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
  recommended_marketplaces: {
    name: string;
    type: string;
    region: string;
    why_suitable: string;
  }[];
  key_practices_for_success: string[];
  warnings_and_constraints: string[];
  data_gaps_and_assumptions: string[];
}
