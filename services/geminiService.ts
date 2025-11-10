import { GoogleGenAI, Modality } from '@google/genai';
import type { UserInput, CropAdvisory, Locale, Coordinates, GroundingChunk, AdvisoryResult, WeatherForecast } from '../types';
import { cropAdvisorySchema, weatherForecastSchema } from './schema';
import { convertSchemaForGemini } from '../utils/schemaConverter';
import { languages, voiceMap } from '../locales/translations';

// Initialize the GoogleGenAI client once at the module level.
// This shared instance will be used by all functions in this service.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function getGroundedContextAndSources(
  location: string, 
  coordinates: Coordinates | null,
  interestedCrops?: string
): Promise<{ context: string, sources: GroundingChunk[] }> {
  try {
    const cropFocus = interestedCrops 
        ? `The user is particularly interested in the following crops: ${interestedCrops}. Focus the market analysis on these if possible, in addition to other relevant crops for the region.`
        : ``;

    const prompt = `
      Based on the location "${location}", provide a concise, up-to-date analysis of the agricultural market.
      ${cropFocus}
      Focus on:
      1.  Current market prices and recent price trends for various crops in this specific region. If the user specified crops of interest, prioritize them.
      2.  Local market demand for agricultural products.
      3.  List key regional marketplaces (mandis) and their typical activity.
      Cite specific news articles, government reports, or local market websites in your findings.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}, {googleMaps: {}}],
            ...(coordinates && {
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: coordinates.latitude,
                            longitude: coordinates.longitude
                        }
                    }
                }
            })
        },
    });

    const groundedText = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    console.log("Grounded context from Search/Maps API:", groundedText);
    console.log("Grounding sources:", sources);

    const context = groundedText || "No specific local market data was found.";
    return { context, sources };

  } catch (error) {
    console.error("Could not fetch grounded context:", error);
    // Return a neutral statement if grounding fails, so the main process can continue.
    return {
        context: "Could not retrieve real-time local market data.",
        sources: []
    };
  }
}

export async function generateCropAdvisory(userInput: UserInput, locale: Locale, enableThinking: boolean, coordinates: Coordinates | null): Promise<AdvisoryResult> {
  const { landSize, location, soilType, irrigation, previousCrop, interestedCrops } = userInput;
  const languageName = languages.find(lang => lang.code === locale)?.name || 'English';

  // Step 1: Get grounded, local context from Search and Maps APIs using the shared AI instance.
  const { context: groundedContext, sources } = await getGroundedContextAndSources(location, coordinates, interestedCrops);

  // Step 2: Use the grounded context to generate the structured advisory.
  const userInterestContext = interestedCrops
    ? `The user has expressed specific interest in these crops: ${interestedCrops}. While your primary goal is to recommend the MOST suitable crop based on all factors, consider their interest. If one of their preferred crops is a viable (though perhaps not optimal) option, you can recommend it, but you MUST clearly justify why it's a good choice and also mention any better alternatives in the 'warnings_and_constraints' section.`
    : ``;

  const prompt = `
    You are an expert agricultural advisor and environmental scientist specializing in sustainable farming for specific global regions.
    Your primary goal is to provide a crop recommendation that is **environmentally sustainable** and **economically viable** for the user's specific location and resources.
    The user's preferred language is ${languageName}.
    **CRITICAL REQUIREMENT:** The entire JSON response you provide, including all string values for descriptions, notes, assumptions, and reasons, MUST be written exclusively in the ${languageName} language. Do not use any English text in the JSON values. The JSON keys themselves must remain in English as defined by the schema.

    User Data:
    - Land Size: ${landSize}
    - Location: ${location}
    - Soil Type: ${soilType}
    - Primary Irrigation Source: ${irrigation}
    - Previous Crop Harvested: ${previousCrop || 'Not specified'}
    - Crops of Interest: ${interestedCrops || 'Not specified'}

    Real-time Local Context (from Google Search and Maps):
    ---
    ${groundedContext}
    ---

    **User's Crop Preference:**
    ${userInterestContext}

    **Decision-Making Hierarchy & Key Instructions:**

    1.  **Water & Climate First (Most Important):** Your analysis MUST begin with the user's Location (${location}) and Irrigation Source (${irrigation}). A recommendation is only valid if the crop's water needs can be realistically met by the specified irrigation method within that region's climate. **This rule overrides the user's preference if their interested crops are unsuitable.**
    
    2.  **Strict Irrigation & Climate Matching:**
        - If the irrigation is 'Rain-fed' in an arid or semi-arid region (e.g., Saudi Arabia, Rajasthan in India), you MUST recommend only highly drought-tolerant crops like millets, sorghum, date palms, or specific legumes. Do NOT suggest water-intensive vegetables or grains, even if the user expressed interest in them.
        - If you recommend a water-intensive crop (like Pumpkin, Tomato, Sugarcane, Rice), you MUST explicitly justify this in the \`why.soil_suitability\` or \`why.crop_rotation\` field by stating that it is **only possible due to the user's specified advanced irrigation method** (e.g., 'Drip Irrigation', 'Canal Water'). This justification is mandatory.

    3.  **Economic Viability (Secondary):** After ensuring environmental suitability, use the "Real-time Local Context" to make all financial projections realistic. Ground your estimates for 'farm_gate_price' and 'market_demand' in the provided data.
    
    4.  **Conservative Projections:** Do not always assume a profit. If market prices are low or input costs are high for the region, your 'net_profit_for_user_land' must reflect a potential loss.
    
    5.  **Financials & Units:** All financial calculations must be in Indian Rupees (INR) and based on the user's land size (${landSize}). Correctly interpret common area units (e.g., acres, hectares, bigha).

    6.  **Crop Naming:** The 'suggested_crop_for_cultivation' MUST be the common name of the crop, correctly translated into ${languageName}. For example, for 'Cotton' in Telugu, use 'పత్తి', not a transliteration.

    7.  **Detailed Plans:** Provide comprehensive pest/disease management and fertilizer schedules as requested by the schema.
    
    8.  **Soil Health Analysis:** Based on the user's 'Soil Type' (${soilType}), generate a detailed analysis. Provide specific, actionable recommendations for improvement. For each recommendation ('practice', 'benefit', 'how_to'), ensure the 'how_to' is a step-by-step list of strings.
  `;

  try {
    const geminiSchema = convertSchemaForGemini(cropAdvisorySchema.schema);
    
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: geminiSchema,
    };

    if (enableThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: config,
    });

    const jsonText = response.text;
    
    if (!jsonText) {
      throw new Error("The AI model returned an empty response.");
    }
    
    const advisory: CropAdvisory = JSON.parse(jsonText);
    return { advisory, sources };

  } catch (error)
 {
    console.error("Error interacting with Gemini API:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse the AI model's response as JSON. The model may have returned an invalid format.");
    }
    throw new Error("Failed to generate crop advisory from the AI model.");
  }
}


export async function generateSpeech(text: string, locale: Locale): Promise<string> {
    try {
        const voiceName = voiceMap[locale] || 'Kore';
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from the API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw new Error("Failed to generate audio from text.");
    }
}

export async function getWeatherForecast(location: string, locale: Locale): Promise<WeatherForecast> {
    const languageName = languages.find(lang => lang.code === locale)?.name || 'English';
    const prompt = `
        Act as a weather API. Provide the current weather and a realistic, 5-day forecast for the location: "${location}".
        - The current day's 'day' should be "Today". The following days should be the names of the weekdays.
        - All text descriptions (like 'condition' and 'day' names) MUST be in the ${languageName} language.
        - Do not use English for any text values in the JSON output.
        - The JSON keys must remain in English as defined by the schema.
        - Ensure temperatures are in Celsius.
        - **Crucially, map weather conditions to the 'icon' enum value as follows:**
          - For clear, sunny, mostly sunny, or hazy sunshine, use 'Sunny'.
          - For partly cloudy, partly sunny, or broken clouds, use 'PartlyCloudy'.
          - For cloudy, overcast, or mostly cloudy, use 'Cloudy'.
          - For rain, showers, drizzle, or light rain, use 'Rain'.
          - For thunderstorms or isolated thunderstorms, use 'Thunderstorm'.
          - For snow or flurries, use 'Snow'.
          - For windy or breezy conditions, use 'Windy'.
    `;

    try {
        const geminiSchema = convertSchemaForGemini(weatherForecastSchema.schema);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: geminiSchema,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("Weather model returned an empty response.");
        }
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error fetching weather forecast:", error);
        throw new Error("Failed to generate weather forecast from the AI model.");
    }
}