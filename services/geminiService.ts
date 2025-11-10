import { GoogleGenAI, Modality } from '@google/genai';
import type { UserInput, CropAdvisory, Locale, Coordinates, GroundingChunk, AdvisoryResult } from '../types';
import { cropAdvisorySchema } from './schema';
import { convertSchemaForGemini } from '../utils/schemaConverter';
import { languages, voiceMap } from '../locales/translations';

async function getGroundedContextAndSources(
  location: string, 
  coordinates: Coordinates | null,
  ai: GoogleGenAI
): Promise<{ context: string, sources: GroundingChunk[] }> {
  try {
    const prompt = `
      Based on the location "${location}", provide a concise, up-to-date analysis of the agricultural market.
      Focus on:
      1.  Current market prices and recent price trends for various crops in this specific region.
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { landSize, location, soilType, irrigation, previousCrop } = userInput;
  const languageName = languages.find(lang => lang.code === locale)?.name || 'English';

  // Step 1: Get grounded, local context from Search and Maps APIs.
  const { context: groundedContext, sources } = await getGroundedContextAndSources(location, coordinates, ai);

  // Step 2: Use the grounded context to generate the structured advisory.
  const prompt = `
    You are an expert agricultural advisor. Your task is to generate a comprehensive and actionable crop advisory.
    The user's preferred language is ${languageName}.
    **CRITICAL REQUIREMENT:** The entire JSON response you provide, including all string values for descriptions, notes, assumptions, and reasons, MUST be written exclusively in the ${languageName} language. Do not use any English text in the JSON values. The JSON keys themselves must remain in English as defined by the schema.

    User Data:
    - Land Size: ${landSize}
    - Location: ${location}
    - Soil Type: ${soilType}
    - Primary Irrigation Source: ${irrigation}
    - Previous Crop Harvested: ${previousCrop || 'Not specified'}

    Real-time Local Context (from Google Search and Maps):
    ---
    ${groundedContext}
    ---

    Key Instructions:
    1.  **Crucial:** Use the "Real-time Local Context" to make all financial projections as realistic as possible. Ground your estimates for 'farm_gate_price' and 'estimated_total_expense_for_user_land' in the data provided.
    2.  **Be Conservative:** Do not always assume a profit. If the current market prices are low or input costs are high, your 'net_profit_for_user_land' must reflect a potential loss.
    3.  All financial calculations must be in Indian Rupees (INR) and based on the user's specified land size (${landSize}). Interpret common units (e.g., acres, hectares, square meters, bigha, gaj) correctly for all calculations.
    4.  Heavily weigh the "Real-time Local Context" when determining the 'suggested_crop_for_cultivation', 'why.market_demand', and 'recommended_marketplaces'.
    5.  For the 'suggested_crop_for_cultivation', provide the common name of the crop. This name MUST be the properly translated word for the crop in ${languageName}, not a phonetic transliteration from English. For example, if the crop is 'Cotton' and the language is Telugu, the output should be 'పత్తి', not 'కాటన్'.
    6.  Provide a detailed pest and disease management plan. For each common pest or disease, list its symptoms and provide multiple actionable management strategies.
    7.  Outline a clear fertilizer application schedule. For each stage of crop growth (like basal dose, vegetative stage, flowering), specify the type of fertilizer, the dosage per acre, and any important application notes.
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
