
import { GoogleGenAI } from "@google/genai";
import type { UserInput, CropAdvisory } from '../types';
import { cropAdvisorySchema } from './schema';
import { convertSchemaForGemini } from '../utils/schemaConverter';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const geminiSchema = convertSchemaForGemini(cropAdvisorySchema.schema);

export async function generateCropAdvisory(userInput: UserInput): Promise<CropAdvisory> {
  const { landSize, location, soilType, irrigation } = userInput;

  const prompt = `
    You are an expert agricultural advisor. Based on the following user-provided data, generate a comprehensive and actionable crop advisory.
    The user is located in a region where the currency is Indian Rupees (INR). All financial calculations should be in INR.

    User Data:
    - Land Size: ${landSize} acres
    - Location: ${location}
    - Soil Type: ${soilType}
    - Primary Irrigation Source: ${irrigation}

    Please provide a detailed plan covering all aspects from cost to profitability.
    Your response must be in the specified JSON format. Do not include any introductory text, markdown formatting, or any content outside of the JSON structure.
    Calculate the total expenses and revenue based on the provided land size of ${landSize} acres.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiSchema,
      },
    });

    const jsonText = response.text.trim();
    const advisoryData: CropAdvisory = JSON.parse(jsonText);
    return advisoryData;

  } catch (error) {
    console.error("Error generating content from Gemini API:", error);
    if (error instanceof Error && error.message.includes("429")) {
        throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw new Error("Failed to generate crop advisory from the AI model.");
  }
}
