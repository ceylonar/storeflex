
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-optimal-price.ts';
import '@/ai/flows/getProductInfoFromBarcode.ts';
import '@/ai/flows/ai-assistant-flow.ts';

