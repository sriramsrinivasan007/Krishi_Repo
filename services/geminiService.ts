import { GoogleGenAI, Modality } from '@google/genai';
import type { UserInput, CropAdvisory, Locale, Coordinates, GroundingChunk, AdvisoryResult, WeatherForecast } from '../types';
import { cropAdvisorySchema, weatherForecastSchema } from './schema';
import { convertSchemaForGemini } from '../utils/schemaConverter';
import { languages, voiceMap } from '../locales/translations';
import { getAiClient } from '../utils/geminiClient';

async function getGroundedContextAndSources(
  ai: GoogleGenAI,
  location: string, 
  coordinates: Coordinates | null
): Promise<{ context: string, sources: GroundingChunk[] }> {
  try {
    const prompt = `
      Based on the location "${location}", provide a concise, up-to-date analysis of the agricultural market.
      Focus on:
      1.  Current market prices and recent price trends for various crops suitable for this specific region.
      2.  Local market demand for agricultural products.
      3.  List key regional marketplaces (mandis), their typical activity, and their contact phone numbers if publicly available.
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
    // Re-throw to be caught by the caller.
    if (error instanceof Error) throw error;
    return {
        context: "Could not retrieve real-time local market data.",
        sources: []
    };
  }
}

export async function generateCropAdvisory(userInput: UserInput, locale: Locale, enableThinking: boolean, coordinates: Coordinates | null): Promise<AdvisoryResult> {
  const ai = getAiClient();
  const { landSize, location, soilType, irrigation, phoneNumber } = userInput;
  const languageName = languages.find(lang => lang.code === locale)?.name || 'English';

  try {
    // Step 1: Get grounded, local context from Search and Maps APIs using the shared AI instance.
    const { context: groundedContext, sources } = await getGroundedContextAndSources(ai, location, coordinates);

    // Step 2: Use the grounded context to generate the structured advisory.
    const prompt = `
      You are an expert agricultural advisor and environmental scientist specializing in sustainable farming for specific global regions.
      Your primary goal is to provide a crop recommendation that is **environmentally sustainable** and **economically viable** for the user's specific location and resources.
      The user's preferred language is ${languageName}.
      **CRITICAL REQUIREMENT:** The entire JSON response you provide, including all string values for descriptions, notes, assumptions, and reasons, MUST be written exclusively in the ${languageName} language. Do not use any English text in the JSON values. The JSON keys themselves must remain in English as defined by the schema.

      **JSON Formatting Rules:**
      - Ensure the final output is a single, valid JSON object that strictly adheres to the provided schema.
      - **Crucially, if any string value within the JSON contains double quotes ("), they MUST be properly escaped with a backslash (\\"). For example, instead of "saying "hello"", write "saying \\"hello\\"". This is critical to prevent parsing errors.**
      - Do not include any text, explanations, or markdown fences (like \`\`\`json) before or after the JSON object.

      User Data:
      - Land Size: ${landSize}
      - Location: ${location}
      - Soil Type: ${soilType}
      - Primary Irrigation Source: ${irrigation}
      - User Phone Number for Alerts: ${phoneNumber}

      Real-time Local Context (from Google Search and Maps):
      ---
      ${groundedContext}
      ---

      **Decision-Making Hierarchy & Key Instructions:**

      1.  **Water & Climate First (Most Important):** Your analysis MUST begin with the user's Location (${location}) and Irrigation Source (${irrigation}). A recommendation is only valid if the crop's water needs can be realistically met by the specified irrigation method within that region's climate.
      
      2.  **Strict Irrigation & Climate Matching:**
          - If the irrigation is 'Rain-fed' in an arid or semi-arid region (e.g., Saudi Arabia, Rajasthan in India), you MUST recommend only highly drought-tolerant crops like millets, sorghum, date palms, or specific legumes. Do NOT suggest water-intensive vegetables or grains.
          - If you recommend a water-intensive crop (like Pumpkin, Tomato, Sugarcane, Rice), you MUST explicitly justify this in the \`why.soil_suitability\` or \`why.crop_rotation\` field by stating that it is **only possible due to the user's specified advanced irrigation method** (e.g., 'Drip Irrigation', 'Canal Water'). This justification is mandatory.

      3.  **Economic Viability (Secondary):** After ensuring environmental suitability, use the "Real-time Local Context" to make all financial projections realistic. Ground your estimates for 'farm_gate_price' and 'market_demand' in the provided data.
      
      4.  **Conservative Projections:** Do not always assume a profit. If market prices are low or input costs are high for the region, your 'net_profit_for_user_land' must reflect a potential loss.
      
      5.  **Financials & Units:** All financial calculations must be in Indian Rupees (INR) and based on the user's land size (${landSize}). Correctly interpret common area units (e.g., acres, hectares, bigha).

      6.  **Crop Naming:** The 'suggested_crop_for_cultivation' MUST be the common name of the crop, correctly translated into ${languageName}. For example, for 'Cotton' in Telugu, use 'పత్తి', not a transliteration.

      7.  **Detailed Plans:** Provide comprehensive pest/disease management, fertilizer schedules, and recommended marketplaces. For each marketplace, you MUST include a contact phone number if it is publicly available. If a phone number cannot be found, omit the field or leave it empty.
      
      8.  **Soil Health Analysis:** Based on the user's 'Soil Type' (${soilType}), generate a detailed analysis. Provide specific, actionable recommendations for improvement. For each recommendation ('practice', 'benefit', 'how_to'), ensure the 'how_to' is a step-by-step list of strings.
    `;

    const geminiSchema = convertSchemaForGemini(cropAdvisorySchema.schema);
    const modelName = enableThinking ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: geminiSchema,
    };

    if (enableThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });

    let jsonText = response.text;
    
    if (!jsonText) {
      throw new Error("The AI model returned an empty response.");
    }
    
    // Clean the response text: remove markdown fences and trim whitespace.
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    const advisory: CropAdvisory = JSON.parse(jsonText);
    return { advisory, sources };

  } catch (error)
 {
    console.error("Error interacting with Gemini API:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse the AI model's response as JSON. The model may have returned an invalid format.");
    }
    // Re-throw other errors to be handled by the UI
    throw error;
  }
}


export async function generateSpeech(text: string, locale: Locale): Promise<string> {
    const ai = getAiClient();
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
        throw error;
    }
}

export async function getWeatherForecast(location: string, locale: Locale): Promise<WeatherForecast> {
    const ai = getAiClient();
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
        throw error;
    }
}