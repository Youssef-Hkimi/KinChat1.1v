import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { NPCS, saveNPCs, loadNPCs } from '../npcs';
import { Client } from 'discord.js';
import { sseManager } from './sse';
import { registerApiRoutes } from './routes';

export function startWebServer(client: Client) {
    const app = express();
    const port = 3000;

    app.use(cors());
    app.use(express.json());

    // Simple Authentication Middleware
    const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const authHeader = req.headers.authorization;
        const password = process.env.ADMIN_PASSWORD;

        if (!password) {
            console.warn("ADMIN_PASSWORD not set in .env. Admin Dashboard is insecure!");
            return next();
        }

        if (authHeader === `Bearer ${password}`) {
            return next();
        }

        res.status(401).json({ error: "Unauthorized" });
    };

    // SSE Stream endpoint
    app.get('/api/stream', authenticate, (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        sseManager.addClient(res);
    });

    registerApiRoutes(app, client);

    // Legacy API Routes (Keep for compatibility if needed, or remove)
    app.get('/api/npcs', authenticate, (req, res) => {
        // Ensure we always have the freshest data from memory
        res.json(NPCS);
    });

    app.post('/api/npcs', authenticate, (req, res) => {
        const updatedNPC = req.body;
        const index = NPCS.findIndex(n => n.id === updatedNPC.id);

        if (index !== -1) {
            NPCS[index] = { ...NPCS[index], ...updatedNPC };
            saveNPCs();
            res.json({ success: true, npc: NPCS[index] });
        } else {
            const newNPC = {
                ...updatedNPC,
                triggerKeywords: updatedNPC.triggerKeywords || [updatedNPC.name.toLowerCase()],
                responseProbability: updatedNPC.responseProbability || 0.05,
                cooldownMs: updatedNPC.cooldownMs || 60000,
                likes: updatedNPC.likes || [],
                dislikes: updatedNPC.dislikes || [],
                schedule: updatedNPC.schedule || { morning: {}, afternoon: {}, evening: {}, night: {} }
            };
            NPCS.push(newNPC);
            saveNPCs();
            res.json({ success: true, npc: newNPC });
        }
    });

    app.get('/api/settings', authenticate, (req, res) => {
        try {
            const data = fs.readFileSync(path.join(__dirname, '../data/embedConfig.json'), 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: "Failed to load settings" });
        }
    });

    app.post('/api/settings', authenticate, (req, res) => {
        try {
            fs.writeFileSync(path.join(__dirname, '../data/embedConfig.json'), JSON.stringify(req.body, null, 4), 'utf8');
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: "Failed to save settings" });
        }
    });

    app.post('/api/login', (req, res) => {
        const { password } = req.body;
        if (password === process.env.ADMIN_PASSWORD) {
            res.json({ success: true, token: password });
        } else {
            res.status(401).json({ error: "Invalid password" });
        }
    });

    // Serve Static Frontend
    app.use(express.static(path.join(__dirname, '../../public')));

    app.listen(port, () => {
        console.log(`🚀 Admin Web Dashboard running on http://localhost:${port}`);
    });
}
