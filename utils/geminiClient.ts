import { GoogleGenAI } from '@google/genai';

/**
 * Creates and returns a GoogleGenAI client instance.
 * It checks for the API_KEY environment variable.
 * Throws an error if no valid API key is found.
 * @returns An instance of the GoogleGenAI client.
 */
export function getAiClient(): GoogleGenAI {
  // FIX: Adhering to the project guidelines to use `process.env.API_KEY`.
  // The API key is expected to be available in the execution environment.
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    // This specific error message is caught by the UI components to display a
    // more user-friendly and helpful message about configuring the environment.
    throw new Error("API_KEY environment variable is not configured");
  }
  return new GoogleGenAI({ apiKey });
}
