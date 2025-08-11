import {genkit, GenkitError} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Throw a more user-friendly error if the API key is missing.
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.warn(
    'GEMINI_API_KEY is not set. AI features will be disabled. See README.md for instructions.'
  );
}

// Initialize genkit with a conditional plugin.
// If the API key is missing, the googleAI plugin will not be loaded.
export const ai = genkit({
  plugins: geminiApiKey ? [googleAI({apiKey: geminiApiKey})] : [],
});

// A helper function to check if AI is configured before running a flow.
export function ensureAiIsConfigured() {
  if (!geminiApiKey) {
    throw new GenkitError({
        status: 'UNAVAILABLE',
        message: "You are not eligible for this service. The Google AI API Key is missing. Please refer to the README.md for setup instructions."
    });
  }
}
