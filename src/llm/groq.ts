import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { NPC } from '../npcs/index';
import { sseManager } from '../server/sse';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || ''
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
                model: "llama-3.3-70b-versatile",
                temperature: 0.9,
                presence_penalty: 0.6,
                frequency_penalty: 0.8,
                max_tokens: 150,
            }, { timeout: 8000, maxRetries: 0 }); // 8 second timeout
        } catch (err: any) {
            // Fallback to a much faster, higher rate-limit model if the main model times out or rate limits
            console.log("Fallback triggered due to:", err.message);
            chatCompletion = await groq.chat.completions.create({
                messages: messages as any,
                model: "llama-3.1-8b-instant",
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
