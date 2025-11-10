

export const cropAdvisorySchema = {
  "name": "crop_advisory_schema",
  "description": "Structured crop cultivation recommendation including costs, irrigation, profitability, and case studies.",
  "schema": {
    "type": "object",
    "properties": {
      "suggested_crop_for_cultivation": { "type": "string" },
      "why": {
        "type": "object",
        "properties": {
          "soil_suitability": { "type": "string" },
          "crop_rotation": { "type": "string" },
          "market_demand": { "type": "string" }
        }
      },
      "time_to_complete_harvest": {
        "type": "object",
        "properties": {
          "duration_days_range": { "type": "string" },
          "season_window": { "type": "string" },
          "assumptions": { "type": "string" }
        }
      },
      "estimated_total_expense_for_user_land": {
        "type": "object",
        "properties": {
          "currency": { "type": "string", "default": "INR" },
          "amount": { "type": "number" },
          "breakdown": {
            "type": "object",
            "properties": {
              "seeds": { "type": "number" },
              "land_preparation": { "type": "number" },
              "fertilizer_and_nutrients": { "type": "number" },
              "irrigation_and_water": { "type": "number" },
              "labor": { "type": "number" },
              "pest_and_disease_control": { "type": "number" },
              "harvesting_and_transport": { "type": "number" },
              "miscellaneous": { "type": "number" }
            }
          },
          "unit_cost_basis": { "type": "string" },
          "assumptions": { "type": "string" }
        }
      },
      "irrigation_schedule": {
        "type": "object",
        "properties": {
          "frequency": { "type": "string" },
          "method": { "type": "string" },
          "seasonal_adjustments": { "type": "string" },
          "notes": { "type": "string" }
        }
      },
      "profitability_projection": {
        "type": "object",
        "properties": {
          "expected_yield": {
            "type": "object",
            "properties": {
              "value_range_per_acre": { "type": "string" },
              "unit": { "type": "string", "default": "quintals per acre" },
              "assumptions": { "type": "string" }
            }
          },
          "farm_gate_price": {
            "type": "object",
            "properties": {
              "currency": { "type": "string", "default": "INR" },
              "price_per_quintal_assumed": { "type": "number" },
              "assumptions": { "type": "string" }
            }
          },
          "gross_revenue_for_user_land": {
            "type": "object",
            "properties": {
              "currency": { "type": "string", "default": "INR" },
              "amount_range": { "type": "string" }
            }
          },
          "net_profit_for_user_land": {
            "type": "object",
            "properties": {
              "currency": { "type": "string", "default": "INR" },
              "amount_range": { "type": "string" }
            }
          },
          "roi_percentage_range": { "type": "string" }
        }
      },
      "pest_and_disease_management": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string" },
            "symptoms": { "type": "string" },
            "management": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "fertilizer_recommendations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "stage": { "type": "string" },
            "fertilizer": { "type": "string" },
            "dosage_per_acre": { "type": "string" },
            "application_notes": { "type": "string" }
          }
        }
      },
      "recommended_marketplaces": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string" },
            "region": { "type": "string" },
            "why_suitable": { "type": "string" }
          }
        }
      },
      "key_practices_for_success": {
        "type": "array",
        "items": { "type": "string" }
      },
      "warnings_and_constraints": {
        "type": "array",
        "items": { "type": "string" }
      },
      "data_gaps_and_assumptions": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": [
      "suggested_crop_for_cultivation",
      "why",
      "time_to_complete_harvest",
      "estimated_total_expense_for_user_land",
      "irrigation_schedule",
      "profitability_projection",
      "pest_and_disease_management",
      "fertilizer_recommendations",
      "recommended_marketplaces",
      "warnings_and_constraints",
      "data_gaps_and_assumptions"
    ]
  }
};