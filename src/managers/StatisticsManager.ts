import { getDb } from '../memory/db';

class StatisticsManager {
    public async recordInteraction(guildId: string, userId: string, npcId: string) {
        const db = getDb();
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        await db.run(`
            INSERT INTO DailyStats (date, guildId, messages, npcReplies) 
            VALUES (?, ?, 1, 0)
            ON CONFLICT(date, guildId) DO UPDATE SET messages = messages + 1
        `, [date, guildId]);
    }

    public async recordNpcReply(guildId: string, npcId: string) {
        const db = getDb();
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        await db.run(`
            INSERT INTO DailyStats (date, guildId, messages, npcReplies) 
            VALUES (?, ?, 0, 1)
            ON CONFLICT(date, guildId) DO UPDATE SET npcReplies = npcReplies + 1
        `, [date, guildId]);
    }

    public async getDailyStats(guildId: string, date: string): Promise<{messages: number, npcReplies: number}> {
        const db = getDb();
        const row = await db.get('SELECT messages, npcReplies FROM DailyStats WHERE date = ? AND guildId = ?', [date, guildId]);
        if (!row) return { messages: 0, npcReplies: 0 };
        return row as {messages: number, npcReplies: number};
    }
}

export const statisticsManager = new StatisticsManager();
