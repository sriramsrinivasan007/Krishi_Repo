import { GoogleGenAI } from '@google/genai';

/**
 * Creates and returns a GoogleGenAI client instance.
 * It checks for VITE_API_KEY (for Vercel/Vite builds) and falls back to API_KEY.
 * Throws an error if no valid API key is found.
 * @returns An instance of the GoogleGenAI client.
 */
export function getAiClient(): GoogleGenAI {
  // For frontend frameworks like Vite, environment variables exposed to the browser
  // must be prefixed (e.g., VITE_). Vercel requires this configuration for deployment.
  const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    // This specific error message is caught by the UI components to display a
    // more user-friendly and helpful message about configuring the environment.
    throw new Error("API_KEY environment variable is not configured");
  }
  return new GoogleGenAI({ apiKey });
}
