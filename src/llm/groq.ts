import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { NPC } from '../npcs/index';
import { sseManager } from '../server/sse';

dotenv.config();

const apiKey = process.env.CEREBRAS_API_KEY || 'csk-fcy32ffnwch8wpe3f5r33jw2yjdr88c53f26fy4fetyf3np8';
const groq = new Groq({
    apiKey: apiKey,
    baseURL: 'https://api.cerebras.ai/v1'
});

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function generateNPCResponse(npc: NPC, messages: ChatMessage[]): Promise<string | null> {
    try {
        let chatCompletion;
        try {
            chatCompletion = await groq.chat.completions.create({
                messages: messages as any,
                model: "gemma-4-31b",
                temperature: 0.9,
                presence_penalty: 0.6,
                frequency_penalty: 0.8,
                max_tokens: 150,
            }, { timeout: 8000, maxRetries: 0 }); // 8 second timeout
        } catch (err: any) {
            console.log("Fallback triggered due to:", err.message);
            chatCompletion = await groq.chat.completions.create({
                messages: messages as any,
                model: "zai-glm-4.7",
                temperature: 0.9,
                presence_penalty: 0.6,
                frequency_penalty: 0.8,
                max_tokens: 150,
            }, { timeout: 8000, maxRetries: 1 });
        }

        const content = chatCompletion.choices[0]?.message?.content || "*remains silent*";
        console.log(`[LLM OUTPUT - ${npc.name}]:`, content);
        sseManager.broadcast('activity', { type: 'llm', message: `Groq generated response for ${npc.name}` });
        
        // If the model decides not to reply, it should return NO_REPLY
        if (content.trim().toUpperCase() === 'NO_REPLY') {
            return null;
        }

        return content.trim();
    } catch (error: any) {
        console.error("Groq API Error:", error);
        sseManager.broadcast('activity', { type: 'error', message: `Groq API Error: ${error.message}` });
        return null;
    }
}
