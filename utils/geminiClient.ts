import { GoogleGenAI } from '@google/genai';

/**
 * Creates and returns a GoogleGenAI client instance.
 * It checks for the API_KEY environment variable.
 * Throws an error if no valid API key is found.
 * @returns An instance of the GoogleGenAI client.
 */
export function getAiClient(): GoogleGenAI {
  // For frontend frameworks like Vite, environment variables exposed to the browser
  // must be prefixed (e.g., VITE_) and are accessed via `import.meta.env`.
  // Vercel correctly injects the dashboard variables into this object during the build.
  // FIX: Adhering to the coding guidelines to exclusively use process.env.API_KEY. This resolves the TypeScript error on line 13.
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    // This specific error message is caught by the UI components to display a
    // more user-friendly and helpful message about configuring the environment.
    throw new Error("API_KEY environment variable is not configured");
  }
  return new GoogleGenAI({ apiKey });
}
