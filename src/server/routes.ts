import { Express, Request, Response } from 'express';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { getDb } from '../memory/db';
import { botPresenceManager } from '../managers/BotPresenceManager';
import { partnerManager } from '../managers/PartnerManager';
import os from 'os';
import { sseManager } from './sse';

export function registerApiRoutes(app: Express, client: Client) {

    // Helper to verify Admin token
    const authenticate = (req: Request, res: Response, next: Function) => {
        const authHeader = req.headers.authorization;
        const password = process.env.ADMIN_PASSWORD;

        if (!password) {
            return next();
        }

        if (authHeader === `Bearer ${password}`) {
            return next();
        }
        res.status(401).json({ error: "Unauthorized" });
    };

    app.get('/api/dev/overview', authenticate, async (req, res) => {
        try {
            const db = getDb();
            const date = new Date().toISOString().split('T')[0];
            
            // Total Servers and Users
            const totalServers = client.guilds.cache.size;
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

            // Daily Stats
            let msgsToday = 0;
            let repliesToday = 0;
            const dailyRows = await db.all('SELECT messages, npcReplies FROM DailyStats WHERE date = ?', [date]);
            for (const row of dailyRows) {
                msgsToday += row.messages;
                repliesToday += row.npcReplies;
            }

            // Database Size (approximate from file size if we wanted, or just raw queries)
            // For now, let's just get counts
            const totalMemories = (await db.get('SELECT COUNT(*) as count FROM UserMemory')).count;
            const totalRelationships = (await db.get('SELECT COUNT(*) as count FROM Relationships')).count;

            // System Metrics
            const memUsage = process.memoryUsage();
            const memoryMb = (memUsage.rss / 1024 / 1024).toFixed(2);
            
            // Note: CPU calculation requires tracking over time, we provide load avg for now
            const cpuLoad = os.loadavg()[0].toFixed(2);

            res.json({
                status: '🟢 Online',
                totalServers,
                totalUsers,
                msgsToday,
                repliesToday,
                totalMemories,
                totalRelationships,
                memoryMb,
                cpuLoad
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/dev/servers', authenticate, async (req, res) => {
        const servers = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL() || '',
            memberCount: g.memberCount,
            joinedAt: g.joinedAt?.toISOString() || ''
        }));
        // Sort by member count descending
        servers.sort((a, b) => b.memberCount - a.memberCount);
        res.json(servers);
    });

    app.get('/api/dev/presence', authenticate, (req, res) => {
        // Read directly from botPresenceManager
        // For simplicity, we just return the array
        // But since it's private in the manager, we'll add a getter, or just read from DB
        import('../memory/db').then(async ({ getGlobalSetting }) => {
            const raw = await getGlobalSetting('presencePlaylist', '[]');
            res.json(JSON.parse(raw));
        });
    });

    app.post('/api/dev/presence', authenticate, async (req, res) => {
        try {
            await botPresenceManager.savePlaylist(req.body);
            res.json({ success: true });
            sseManager.broadcast('activity', { type: 'system', message: 'Bot Presence playlist updated.' });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/dev/actions/restart', authenticate, (req, res) => {
        res.json({ success: true, message: 'Restarting bot...' });
        sseManager.broadcast('activity', { type: 'system', message: 'Developer triggered bot restart.' });
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    });

    app.post('/api/dev/actions/broadcast', authenticate, async (req, res) => {
        try {
            const { title, message, target } = req.body;
            let count = 0;
            
            const embed = new EmbedBuilder()
                .setTitle(title || '📢 System Announcement')
                .setDescription(message)
                .setColor('#facc15')
                .setTimestamp();

            for (const guild of client.guilds.cache.values()) {
                const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && guild.members.me?.permissionsIn(c).has('SendMessages')) as TextChannel;
                if (channel) {
                    await channel.send({ embeds: [embed] }).catch(() => {});
                    count++;
                }
            }
            
            sseManager.broadcast('activity', { type: 'system', message: `Broadcast sent to ${count} servers.` });
            res.json({ success: true, serversReached: count });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Partner CRM Routes
    app.get('/api/dev/partners', authenticate, async (req, res) => {
        try {
            const partners = await partnerManager.getPartners();
            res.json(partners);
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.post('/api/dev/partners', authenticate, async (req, res) => {
        try {
            await partnerManager.addPartner(req.body);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.put('/api/dev/partners/:id', authenticate, async (req, res) => {
        try {
            await partnerManager.updatePartner({ ...req.body, id: req.params.id as string });
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.delete('/api/dev/partners/:id', authenticate, async (req, res) => {
        try {
            await partnerManager.deletePartner(req.params.id as string);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.get('/api/dev/partner-stats', authenticate, async (req, res) => {
        try {
            const stats = await partnerManager.getStats();
            res.json(stats);
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
}
