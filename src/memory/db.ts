import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database;

export async function initMemory() {
    db = await open({
        filename: path.join(__dirname, '../../database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS UserInteractions (
            userId TEXT,
            npcId TEXT,
            messageCount INTEGER DEFAULT 0,
            lastSeen INTEGER,
            PRIMARY KEY (userId, npcId)
        );

        CREATE TABLE IF NOT EXISTS UserMemory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            npcId TEXT,
            fact TEXT
        );

        CREATE TABLE IF NOT EXISTS Relationships (
            userId TEXT,
            npcId TEXT,
            score INTEGER DEFAULT 0,
            trust INTEGER DEFAULT 0,
            humor INTEGER DEFAULT 0,
            respect INTEGER DEFAULT 0,
            bondRank TEXT DEFAULT 'Stranger',
            friendship INTEGER DEFAULT 0,
            annoyance INTEGER DEFAULT 0,
            favoriteNickname TEXT DEFAULT '',
            firstInteractionDate TEXT DEFAULT '',
            favoriteConversation TEXT DEFAULT '',
            PRIMARY KEY (userId, npcId)
        );

        CREATE TABLE IF NOT EXISTS GuildSettings (
            guildId TEXT PRIMARY KEY,
            mode TEXT DEFAULT 'SPECIFIC_CHANNELS',
            allowedChannels TEXT DEFAULT '[]',
            ignoredChannels TEXT DEFAULT '[]',
            npcSleepSchedule BOOLEAN DEFAULT 0,
            worldEvents BOOLEAN DEFAULT 1,
            botChatter BOOLEAN DEFAULT 1,
            responseFrequency TEXT DEFAULT 'Normal',
            quietHoursStart TEXT DEFAULT '01:00',
            quietHoursEnd TEXT DEFAULT '08:00',
            mentionBehavior TEXT DEFAULT 'Always',
            cooldownMin INTEGER DEFAULT 0,
            cooldownMax INTEGER DEFAULT 60000,
            repliesPerHour INTEGER DEFAULT 50,
            eventEnabled BOOLEAN DEFAULT 1,
            setupComplete BOOLEAN DEFAULT 0,
            setupCompletedAt TEXT DEFAULT '',
            setupCompletedBy TEXT DEFAULT '',
            communityMode TEXT DEFAULT 'Standard'
        );

        CREATE TABLE IF NOT EXISTS DailyStats (
            date TEXT,
            guildId TEXT,
            messages INTEGER DEFAULT 0,
            npcReplies INTEGER DEFAULT 0,
            PRIMARY KEY (date, guildId)
        );

        CREATE TABLE IF NOT EXISTS UserHints (
            userId TEXT PRIMARY KEY,
            hasReceivedReminder BOOLEAN DEFAULT 0,
            hasReceivedSmartHint BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS GlobalSettings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS UserEconomy (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0,
            lastBankruptcy TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS PartnerNetwork (
            id TEXT PRIMARY KEY,
            name TEXT,
            icon TEXT,
            invite TEXT,
            desc TEXT,
            category TEXT,
            banner TEXT,
            memberCount INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            featured BOOLEAN DEFAULT 0,
            dateAdded TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS PartnerStats (
            partnerId TEXT PRIMARY KEY,
            timesRecommended INTEGER DEFAULT 0,
            timesClicked INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS UserPreferences (
            userId TEXT PRIMARY KEY,
            recommendationsEnabled BOOLEAN DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS UserEconomy (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 5000,
            lastBankruptcy TEXT DEFAULT ''
        );
    `);

    // Schema migrations for existing databases
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN trust INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN humor INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN respect INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN bondRank TEXT DEFAULT "Stranger"'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN friendship INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN annoyance INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN favoriteNickname TEXT DEFAULT ""'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN firstInteractionDate TEXT DEFAULT ""'); } catch (e) {}
    try { await db.exec('ALTER TABLE Relationships ADD COLUMN favoriteConversation TEXT DEFAULT ""'); } catch (e) {}
    
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN ignoredChannels TEXT DEFAULT "[]"'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN npcSleepSchedule BOOLEAN DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN worldEvents BOOLEAN DEFAULT 1'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN botChatter BOOLEAN DEFAULT 1'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN responseFrequency TEXT DEFAULT "Normal"'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN quietHoursStart TEXT DEFAULT "01:00"'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN quietHoursEnd TEXT DEFAULT "08:00"'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN mentionBehavior TEXT DEFAULT "Always"'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN cooldownMin INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN cooldownMax INTEGER DEFAULT 60000'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN repliesPerHour INTEGER DEFAULT 50'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN eventEnabled BOOLEAN DEFAULT 1'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN setupComplete BOOLEAN DEFAULT 0'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN setupCompletedAt TEXT DEFAULT ""'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN setupCompletedBy TEXT DEFAULT ""'); } catch (e) {}
    try { await db.exec('ALTER TABLE GuildSettings ADD COLUMN communityMode TEXT DEFAULT "Standard"'); } catch (e) {}

    console.log('Memory database initialized successfully.');
}

export function getDb() {
    return db;
}

export interface GuildSettings {
    guildId: string;
    mode: 'SPECIFIC_CHANNELS' | 'TRIGGER_ONLY_ANYWHERE';
    allowedChannels: string[];
    ignoredChannels: string[];
    npcSleepSchedule: boolean;
    worldEvents: boolean;
    botChatter: boolean;
    responseFrequency: 'Silent' | 'Low' | 'Normal' | 'Active' | 'Chaotic';
    quietHoursStart: string;
    quietHoursEnd: string;
    mentionBehavior: 'Always' | 'Sometimes' | 'Ignore';
    cooldownMin: number;
    cooldownMax: number;
    repliesPerHour: number;
    eventEnabled: boolean;
    setupComplete: boolean;
    setupCompletedAt: string;
    setupCompletedBy: string;
    communityMode: 'Family Friendly' | 'Standard' | 'Mature';
}

export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
    const row = await db.get('SELECT * FROM GuildSettings WHERE guildId = ?', [guildId]);
    if (!row) {
        return {
            guildId,
            mode: 'SPECIFIC_CHANNELS',
            allowedChannels: [],
            ignoredChannels: [],
            npcSleepSchedule: false,
            worldEvents: true,
            botChatter: true,
            responseFrequency: 'Normal',
            quietHoursStart: '01:00',
            quietHoursEnd: '08:00',
            mentionBehavior: 'Always',
            cooldownMin: 0,
            cooldownMax: 60000,
            repliesPerHour: 50,
            eventEnabled: true,
            setupComplete: false,
            setupCompletedAt: '',
            setupCompletedBy: '',
            communityMode: 'Standard'
        };
    }
    return {
        guildId: row.guildId,
        mode: row.mode,
        allowedChannels: JSON.parse(row.allowedChannels || '[]'),
        ignoredChannels: JSON.parse(row.ignoredChannels || '[]'),
        npcSleepSchedule: Boolean(row.npcSleepSchedule),
        worldEvents: Boolean(row.worldEvents),
        botChatter: Boolean(row.botChatter),
        responseFrequency: row.responseFrequency || 'Normal',
        quietHoursStart: row.quietHoursStart || '01:00',
        quietHoursEnd: row.quietHoursEnd || '08:00',
        mentionBehavior: row.mentionBehavior || 'Always',
        cooldownMin: row.cooldownMin ?? 0,
        cooldownMax: row.cooldownMax ?? 60000,
        repliesPerHour: row.repliesPerHour ?? 50,
        eventEnabled: Boolean(row.eventEnabled ?? 1),
        setupComplete: Boolean(row.setupComplete),
        setupCompletedAt: row.setupCompletedAt || '',
        setupCompletedBy: row.setupCompletedBy || '',
        communityMode: row.communityMode || 'Standard'
    };
}

export async function updateGuildSettings(guildId: string, settings: Partial<GuildSettings>) {
    const current = await getGuildSettings(guildId);
    const updated = { ...current, ...settings };
    await db.run(
        `INSERT INTO GuildSettings (guildId, mode, allowedChannels, ignoredChannels, npcSleepSchedule, worldEvents, botChatter, responseFrequency, quietHoursStart, quietHoursEnd, mentionBehavior, cooldownMin, cooldownMax, repliesPerHour, eventEnabled, setupComplete, setupCompletedAt, setupCompletedBy, communityMode) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON CONFLICT(guildId) DO UPDATE SET 
         mode = excluded.mode, 
         allowedChannels = excluded.allowedChannels,
         ignoredChannels = excluded.ignoredChannels,
         npcSleepSchedule = excluded.npcSleepSchedule,
         worldEvents = excluded.worldEvents,
         botChatter = excluded.botChatter,
         responseFrequency = excluded.responseFrequency,
         quietHoursStart = excluded.quietHoursStart,
         quietHoursEnd = excluded.quietHoursEnd,
         mentionBehavior = excluded.mentionBehavior,
         cooldownMin = excluded.cooldownMin,
         cooldownMax = excluded.cooldownMax,
         repliesPerHour = excluded.repliesPerHour,
         eventEnabled = excluded.eventEnabled,
         setupComplete = excluded.setupComplete,
         setupCompletedAt = excluded.setupCompletedAt,
         setupCompletedBy = excluded.setupCompletedBy,
         communityMode = excluded.communityMode`,
        [
            guildId, 
            updated.mode, 
            JSON.stringify(updated.allowedChannels),
            JSON.stringify(updated.ignoredChannels),
            updated.npcSleepSchedule ? 1 : 0,
            updated.worldEvents ? 1 : 0,
            updated.botChatter ? 1 : 0,
            updated.responseFrequency,
            updated.quietHoursStart,
            updated.quietHoursEnd,
            updated.mentionBehavior,
            updated.cooldownMin,
            updated.cooldownMax,
            updated.repliesPerHour,
            updated.eventEnabled ? 1 : 0,
            updated.setupComplete ? 1 : 0,
            updated.setupCompletedAt,
            updated.setupCompletedBy,
            updated.communityMode
        ]
    );
}

export interface Affinity {
    userId: string;
    npcId: string;
    score: number;
    trust: number;
    humor: number;
    respect: number;
    bondRank: string;
    friendship: number;
    annoyance: number;
    favoriteNickname: string;
    firstInteractionDate: string;
    favoriteConversation: string;
}

export async function getAffinity(userId: string, npcId: string): Promise<Affinity> {
    const row = await db.get('SELECT * FROM Relationships WHERE userId = ? AND npcId = ?', [userId, npcId]);
    if (!row) {
        return { 
            userId, npcId, score: 0, trust: 0, humor: 0, respect: 0, bondRank: 'Stranger',
            friendship: 0, annoyance: 0, favoriteNickname: '', firstInteractionDate: new Date().toISOString(), favoriteConversation: ''
        };
    }
    return row as Affinity;
}

export async function updateAffinity(userId: string, npcId: string, updates: Partial<Affinity>) {
    const current = await getAffinity(userId, npcId);
    const updated = { ...current, ...updates };
    
    if (updated.score < 10) updated.bondRank = 'Stranger';
    else if (updated.score < 30) updated.bondRank = 'Acquaintance';
    else if (updated.score < 60) updated.bondRank = 'Friend';
    else if (updated.score < 100) updated.bondRank = 'Close Friend';
    else updated.bondRank = 'Best Friend';

    await db.run(
        `INSERT INTO Relationships (userId, npcId, score, trust, humor, respect, bondRank, friendship, annoyance, favoriteNickname, firstInteractionDate, favoriteConversation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId, npcId) DO UPDATE SET
         score = excluded.score,
         trust = excluded.trust,
         humor = excluded.humor,
         respect = excluded.respect,
         bondRank = excluded.bondRank,
         friendship = excluded.friendship,
         annoyance = excluded.annoyance,
         favoriteNickname = excluded.favoriteNickname,
         firstInteractionDate = excluded.firstInteractionDate,
         favoriteConversation = excluded.favoriteConversation`,
        [
             userId, npcId, updated.score, updated.trust, updated.humor, updated.respect, updated.bondRank,
            updated.friendship, updated.annoyance, updated.favoriteNickname, updated.firstInteractionDate, updated.favoriteConversation
        ]
    );
}

export async function hasUserInteracted(userId: string): Promise<boolean> {
    const row = await db.get('SELECT SUM(messageCount) as total FROM UserInteractions WHERE userId = ?', [userId]);
    return row && row.total > 0;
}

export interface UserHintStatus {
    userId: string;
    hasReceivedReminder: boolean;
    hasReceivedSmartHint: boolean;
}

export async function getUserHintStatus(userId: string): Promise<UserHintStatus> {
    const row = await db.get('SELECT * FROM UserHints WHERE userId = ?', [userId]);
    if (!row) return { userId, hasReceivedReminder: false, hasReceivedSmartHint: false };
    return {
        userId: row.userId,
        hasReceivedReminder: Boolean(row.hasReceivedReminder),
        hasReceivedSmartHint: Boolean(row.hasReceivedSmartHint)
    };
}

export async function updateUserHintStatus(userId: string, updates: Partial<UserHintStatus>) {
    const current = await getUserHintStatus(userId);
    const updated = { ...current, ...updates };
    await db.run(
        `INSERT INTO UserHints (userId, hasReceivedReminder, hasReceivedSmartHint)
         VALUES (?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET
         hasReceivedReminder = excluded.hasReceivedReminder,
         hasReceivedSmartHint = excluded.hasReceivedSmartHint`,
        [userId, updated.hasReceivedReminder ? 1 : 0, updated.hasReceivedSmartHint ? 1 : 0]
    );
}

export async function getGlobalSetting(key: string, defaultValue: string = ''): Promise<string> {
    const row = await db.get('SELECT value FROM GlobalSettings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
}

export async function setGlobalSetting(key: string, value: string) {
    await db.run(
        `INSERT INTO GlobalSettings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
    );
}

export interface UserEconomy {
    userId: string;
    balance: number;
    lastBankruptcy: string;
}

export async function getUserEconomy(userId: string): Promise<UserEconomy> {
    const row = await db.get('SELECT * FROM UserEconomy WHERE userId = ?', [userId]);
    let eco = row as UserEconomy;
    
    if (!eco) {
        eco = { userId, balance: 5000, lastBankruptcy: '' };
        await db.run('INSERT INTO UserEconomy (userId, balance, lastBankruptcy) VALUES (?, ?, ?)', [eco.userId, eco.balance, eco.lastBankruptcy]);
        return eco;
    }
    
    // Check bankruptcy reset
    if (eco.balance <= 0 && eco.lastBankruptcy) {
        const bankruptcyDate = new Date(eco.lastBankruptcy);
        const now = new Date();
        const diffMs = now.getTime() - bankruptcyDate.getTime();
        // 1 hour = 3600000 ms
        if (diffMs >= 3600000) {
            eco.balance = 5000;
            eco.lastBankruptcy = '';
            await db.run('UPDATE UserEconomy SET balance = ?, lastBankruptcy = ? WHERE userId = ?', [eco.balance, eco.lastBankruptcy, userId]);
        }
    }
    
    return eco;
}

export async function updateUserEconomy(userId: string, balanceChange: number) {
    const eco = await getUserEconomy(userId);
    eco.balance += balanceChange;
    
    if (eco.balance <= 0) {
        eco.balance = 0; // Don't go negative
        // Only set bankruptcy date if they just went bankrupt
        if (!eco.lastBankruptcy) {
            eco.lastBankruptcy = new Date().toISOString();
        }
    } else {
        eco.lastBankruptcy = ''; // Reset bankruptcy if they are above 0 (e.g. from a gift)
    }
    
    await db.run(
        `UPDATE UserEconomy SET balance = ?, lastBankruptcy = ? WHERE userId = ?`,
        [eco.balance, eco.lastBankruptcy, userId]
    );
}
