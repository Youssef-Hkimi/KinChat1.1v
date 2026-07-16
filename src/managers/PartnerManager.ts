import { User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getDb } from '../memory/db';
import { UIManager } from './UIManager';

export interface Partner {
    id: string;
    name: string;
    icon: string;
    invite: string;
    desc: string;
    category: string;
    banner: string;
    memberCount: number;
    status: string;
    featured: boolean;
    dateAdded: string;
    notes: string;
}

class PartnerManager {
    private recentRecommendations = new Map<string, string[]>(); // userId -> [partnerIds]

    async getPartners(): Promise<Partner[]> {
        const db = getDb();
        const rows = await db.all('SELECT * FROM PartnerNetwork');
        return rows.map(r => ({ ...r, featured: Boolean(r.featured) }));
    }

    async getActivePartners(): Promise<Partner[]> {
        const db = getDb();
        const rows = await db.all('SELECT * FROM PartnerNetwork WHERE status = "active"');
        return rows.map(r => ({ ...r, featured: Boolean(r.featured) }));
    }

    async addPartner(partner: Partner) {
        const db = getDb();
        await db.run(
            `INSERT INTO PartnerNetwork (id, name, icon, invite, desc, category, banner, memberCount, status, featured, dateAdded, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [partner.id, partner.name, partner.icon, partner.invite, partner.desc, partner.category, partner.banner, partner.memberCount, partner.status, partner.featured ? 1 : 0, new Date().toISOString(), partner.notes]
        );
        await db.run('INSERT OR IGNORE INTO PartnerStats (partnerId, timesRecommended, timesClicked) VALUES (?, 0, 0)', [partner.id]);
    }

    async updatePartner(partner: Partner) {
        const db = getDb();
        await db.run(
            `UPDATE PartnerNetwork SET name=?, icon=?, invite=?, desc=?, category=?, banner=?, memberCount=?, status=?, featured=?, notes=? WHERE id=?`,
            [partner.name, partner.icon, partner.invite, partner.desc, partner.category, partner.banner, partner.memberCount, partner.status, partner.featured ? 1 : 0, partner.notes, partner.id]
        );
    }

    async deletePartner(id: string) {
        const db = getDb();
        await db.run('DELETE FROM PartnerNetwork WHERE id=?', [id]);
        await db.run('DELETE FROM PartnerStats WHERE partnerId=?', [id]);
    }

    async getStats() {
        const db = getDb();
        return await db.all('SELECT * FROM PartnerStats');
    }

    async recordClick(partnerId: string) {
        const db = getDb();
        await db.run('UPDATE PartnerStats SET timesClicked = timesClicked + 1 WHERE partnerId=?', [partnerId]);
    }

    async sendSpotlightDM(user: User) {
        try {
            const db = getDb();

            // Check User Preferences
            const pref = await db.get('SELECT recommendationsEnabled FROM UserPreferences WHERE userId = ?', [user.id]);
            if (pref && pref.recommendationsEnabled === 0) return;

            const partners = await this.getActivePartners();
            if (partners.length < 1) return; // Not enough partners to show

            const recent = this.recentRecommendations.get(user.id) || [];

            // Filter out recently shown
            let available = partners.filter(p => !recent.includes(p.id));
            if (available.length < 1) {
                // If we ran out of unseen partners, reset their history
                available = [...partners];
                this.recentRecommendations.set(user.id, []);
            }

            // Weighted selection
            const pool: Partner[] = [];
            for (const p of available) {
                pool.push(p);
                if (p.featured) {
                    pool.push(p); // Add twice if featured for higher weight
                    pool.push(p);
                }
            }

            // Pick up to 2 distinct partners
            const pick1 = pool[Math.floor(Math.random() * pool.length)];
            const chosen = [pick1];

            const remainingPool = pool.filter(p => p.id !== pick1.id);
            if (remainingPool.length > 0) {
                const pick2 = remainingPool[Math.floor(Math.random() * remainingPool.length)];
                chosen.push(pick2);
            }

            // Update recent cache
            this.recentRecommendations.set(user.id, [...recent, ...chosen.map(p => p.id)].slice(-10));

            // Update stats
            for (const p of chosen) {
                await db.run('UPDATE PartnerStats SET timesRecommended = timesRecommended + 1 WHERE partnerId=?', [p.id]);
            }

            // Build Embed
            const embed = new EmbedBuilder()
                .setTitle('<a:sparkle:1523677013183828059> Community Spotlight')
                .setDescription("While you're here, check out some amazing Discord communities from our trusted partners!\n\n<:safe:1523677087796432999> **Safe Community Promise**\nWe only partner with communities that meet our quality guidelines. Our goal is to recommend welcoming communities that provide a positive experience.")
                .setColor('#FFD700') // Gold color for spotlight
                .setThumbnail('https://cdn3.emoji.gg/emojis/937928-alien-yap.gif')
                .setImage('https://media.discordapp.net/attachments/1522654547862880266/1523412393701671082/New_Project_1.png?ex=6a4c03da&is=6a4ab25a&hm=6be8a8eae8668214e416bd787986dc5a2eb6c1be42a0a854b785845b82f6c2e7&=&format=webp&quality=lossless')
                .setFooter({ text: 'Recommendations rotate automatically. Use /preferences to disable.' })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>();

            chosen.forEach(p => {
                embed.addFields({ name: `✨ ${p.name} — ${p.category}`, value: p.desc });
                
                // Add a link button for each partner
                // Discord requires URLs to have a valid protocol, assume https:// if missing
                let url = p.invite;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                     // usually Discord invites are https://discord.gg/...
                     url = `https://${url}`;
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setLabel(`Join ${p.name}`)
                        .setStyle(ButtonStyle.Link)
                        .setURL(url)
                );
            });

            // Send DM
            const dmChannel = await user.createDM();
            await dmChannel.send({ embeds: [embed], components: [row] });

        } catch (e) {
            // Silently fail if DMs are closed
            console.error("Failed to send Spotlight DM", e);
        }
    }
}

export const partnerManager = new PartnerManager();
