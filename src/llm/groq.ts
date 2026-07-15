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
        const apiKey = process.env.GROQ_API_KEY || '';
        
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.9,
                    presence_penalty: 0.6,
                    frequency_penalty: 0.8,
                    max_tokens: 150,
                }),
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status} ${text}`);
            }
            chatCompletion = await response.json();
        } catch (err: any) {
            console.log("Fallback triggered due to:", err.message);
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: "llama-3.1-8b-instant",
                    temperature: 0.9,
                    presence_penalty: 0.6,
                    frequency_penalty: 0.8,
                    max_tokens: 150,
                }),
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status} ${text}`);
            }
            chatCompletion = await response.json();
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
