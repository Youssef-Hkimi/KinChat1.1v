import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AutocompleteInteraction, Message, User } from 'discord.js';
import { NPCS, NPC } from '../npcs/index';
import { getUserEconomy, updateUserEconomy } from '../memory/db';

const WIN_BANTER = [
    "Beginner's luck...",
    "You cheated, I know it!",
    "Not bad for a human.",
    "Ugh, fine. Take your money.",
    "Are you counting cards?!"
];

const LOSE_BANTER = [
    "Thanks for the cash!",
    "Too easy.",
    "Maybe stick to Uno...",
    "House always wins.",
    "Better luck next time, loser!"
];

// Custom Emojis mapping provided by the user
const EMOJIS = {
    back: '<:card:1526506445275922524>',
    clubs: {
        'A': '<:card:1526506415408156862>',
        '2': '<:card:1526506451315593236>',
        '3': '<:card:1526506421707870309>',
        '4': '<:card:1526506418264477736>',
        '5': '<:card:1526506428192264192>',
        '6': '<:card:1526506442381856878>',
        '7': '<:card:1526506459880230982>',
        '8': '<:card:1526506454368915476>',
        '9': '<:card:1526506413738819594>',
        '10': '<:card:1526506441073229905>',
        'J': '<:card:1526506439693176844>',
        'Q': '<:card:1526506446936866846>',
        'K': '<:card:1526506461277196319>'
    },
    spades: {
        'A': '<:card:1526506416867770419>',
        '2': '<:card:1526506449927278762>',
        '3': '<:card:1526506411633152100>',
        '4': '<:card:1526506456961126430>',
        '5': '<:card:1526506426376388628>',
        '6': '<:card:1526506419854250074>',
        '7': '<:card:1526506455614754887>',
        '8': '<:card:1526506438271434874>',
        '9': '<:card:1526506425084547104>',
        '10': '<:card:1526506453077200926>',
        'J': '<:card:1526506443807789156>',
        'Q': '<:card:1526506423201042432>',
        'K': '<:card:1526506458521276446>'
    }
};

type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
    value: CardValue;
    emoji: string;
}

function createDeck(): Card[] {
    const deck: Card[] = [];
    const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // Create 4 copies of Spades and Clubs to simulate a multi-deck shoe
    for (let i = 0; i < 4; i++) {
        for (const val of values) {
            deck.push({ value: val, emoji: EMOJIS.clubs[val] });
            deck.push({ value: val, emoji: EMOJIS.spades[val] });
        }
    }
    
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

function calculateScore(hand: Card[]): number {
    let score = 0;
    let aces = 0;
    
    for (const card of hand) {
        if (card.value === 'A') {
            aces += 1;
            score += 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    }
    
    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }
    
    return score;
}

export const data = new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a minigame of Blackjack with an NPC!')
    .addStringOption(option => 
        option.setName('npc')
            .setDescription('The NPC you want to play against')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices = NPCS.map(npc => ({ name: npc.name, value: npc.id }));
    const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue)).slice(0, 25);
    await interaction.respond(filtered);
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const npcId = interaction.options.getString('npc');
    const npc = NPCS.find(n => n.id === npcId);

    if (!npc) {
        return interaction.reply({ content: 'Invalid NPC selected.', ephemeral: true });
    }

    await startBlackjackGame(interaction, interaction.user, npc);
}

export async function startBlackjackGame(source: ChatInputCommandInteraction | Message, user: User, npc: NPC) {
    if (user.id !== '950364079061602304') {
        const msg = '🚧 This minigame is currently in testing and restricted to developers.';
        if ('isChatInputCommand' in source && source.isChatInputCommand()) {
            return source.reply({ content: msg, ephemeral: true });
        } else {
            return (source as Message).reply({ content: msg });
        }
    }

    let eco = await getUserEconomy(user.id);
    if (eco.balance < 100) {
        let waitTimeStr = '';
        if (eco.lastBankruptcy) {
            const resetTime = new Date(eco.lastBankruptcy).getTime() + 3600000;
            const remaining = resetTime - Date.now();
            if (remaining > 0) {
                const mins = Math.ceil(remaining / 60000);
                waitTimeStr = `\nYour $5,000 relief fund will be available in **${mins} minutes**.`;
            }
        }
        const msg = `💸 You don't have enough money to play! You need at least $100 to bet. Current balance: **$${eco.balance}**. ${waitTimeStr}`;
        if ('isChatInputCommand' in source && source.isChatInputCommand()) {
            return source.reply({ content: msg, ephemeral: true });
        } else {
            return (source as Message).reply({ content: msg });
        }
    }

    const infoEmbed = new EmbedBuilder()
        .setTitle(`<:532883cash:1526527010942484510> Blackjack vs ${npc.name}`)
        .setDescription(`Welcome to Blackjack!\n\n**Rules:**\n- Get as close to 21 as possible without going over.\n- Aces are worth 1 or 11.\n- Face cards are worth 10.\n- The dealer (NPC) must hit until they reach 17 or higher.\n\n**Economy:**\n- Current Balance: **$${eco.balance}**\n- Default Bet: **$100**\n\nAre you ready to play against ${npc.name}?`)
        .setColor('#2ecc71')
        .setThumbnail(npc.avatarUrl);

    const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('start_game')
            .setLabel('Start Game ($100)')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('notice')
            .setLabel('Entertainment Only')
            .setStyle(ButtonStyle.Secondary)
    );

    let replyMessage: Message;
    const infoPayload = { embeds: [infoEmbed], components: [startRow] };

    if ('isChatInputCommand' in source && source.isChatInputCommand()) {
        replyMessage = await source.reply({ ...infoPayload, fetchReply: true, ephemeral: true });
    } else {
        replyMessage = await (source as Message).reply(infoPayload);
    }

    const infoCollector = replyMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    infoCollector.on('collect', async i => {
        if (i.user.id !== user.id) {
            await i.reply({ content: 'These buttons are not for you!', ephemeral: true });
            return;
        }

        if (i.customId === 'notice') {
            await i.reply({ content: 'ℹ️ **Notice**: This minigame is for entertainment purposes only. It uses virtual currency and does not involve real-money gambling.', ephemeral: true });
            return;
        }

        if (i.customId === 'start_game') {
            await i.update({ content: '🎲 Starting public game...', embeds: [], components: [] });
            infoCollector.stop();
            
            startGameLogic(i.channel!);
        }
    });

    const startGameLogic = async (channel: any) => {
        let deck: Card[] = [];
        let playerHand: Card[] = [];
        let dealerHand: Card[] = [];
        let playerState: 'playing' | 'stand' | 'bust' | 'blackjack' = 'playing';
        let playerScore = 0;
        let currentBet = 100;
        let isFirstTurn = true;
        let banterMessage = '';

        const processGameEnd = async () => {
            let payout = 0;
            const dScore = calculateScore(dealerHand);
            const pScore = calculateScore(playerHand);

            if (playerState === 'bust') {
                payout = -currentBet;
                banterMessage = LOSE_BANTER[Math.floor(Math.random() * LOSE_BANTER.length)];
            } else if (playerState === 'blackjack') {
                payout = Math.floor(currentBet * 1.5); // 3:2 payout
                banterMessage = WIN_BANTER[Math.floor(Math.random() * WIN_BANTER.length)];
            } else if (playerState === 'stand') {
                if (dScore > 21 || pScore > dScore) {
                    payout = currentBet;
                    banterMessage = WIN_BANTER[Math.floor(Math.random() * WIN_BANTER.length)];
                } else if (dScore > pScore) {
                    payout = -currentBet;
                    banterMessage = LOSE_BANTER[Math.floor(Math.random() * LOSE_BANTER.length)];
                } else {
                    payout = 0; // Push
                    banterMessage = "A tie? How boring.";
                }
            }
            
            await updateUserEconomy(user.id, payout);
            eco = await getUserEconomy(user.id);
        };

        const generateMessagePayload = (hideDealerCard: boolean) => {
            const pScore = calculateScore(playerHand);
            const dScore = hideDealerCard ? calculateScore([dealerHand[0]]) : calculateScore(dealerHand);
            
            let color = '#3498db'; // Default Blue
            let statusMsg = 'Hit, Stand, or Double Down?';
            if (!isFirstTurn && playerState === 'playing') statusMsg = 'Hit or Stand?';
            
            if (playerState === 'bust') {
                color = '#e74c3c'; // Red
                statusMsg = `You Busted! Dealer Wins.\nLost: **$${currentBet}** | Balance: **$${eco.balance}**\n\n*${npc.name} says:* "${banterMessage}"`;
            } else if (playerState === 'blackjack') {
                color = '#f1c40f'; // Gold
                statusMsg = `Blackjack! You Win!\nWon: **$${Math.floor(currentBet * 1.5)}** | Balance: **$${eco.balance}**\n\n*${npc.name} says:* "${banterMessage}"`;
            } else if (playerState === 'stand') {
                if (dScore > 21) {
                    color = '#2ecc71'; // Green
                    statusMsg = `Dealer Busted! You Win!\nWon: **$${currentBet}** | Balance: **$${eco.balance}**\n\n*${npc.name} says:* "${banterMessage}"`;
                } else if (pScore > dScore) {
                    color = '#2ecc71';
                    statusMsg = `You Win!\nWon: **$${currentBet}** | Balance: **$${eco.balance}**\n\n*${npc.name} says:* "${banterMessage}"`;
                } else if (dScore > pScore) {
                    color = '#e74c3c';
                    statusMsg = `Dealer Wins!\nLost: **$${currentBet}** | Balance: **$${eco.balance}**\n\n*${npc.name} says:* "${banterMessage}"`;
                } else {
                    color = '#95a5a6'; // Gray
                    statusMsg = `Push (Tie)!\nNo money won or lost. | Balance: **$${eco.balance}**\n\n*${npc.name} says:* "${banterMessage}"`;
                }
            }

            const pHandStr = playerHand.map(c => c.emoji).join(' ');
            const dHandStr = hideDealerCard ? `${dealerHand[0].emoji} ${EMOJIS.back}` : dealerHand.map(c => c.emoji).join(' ');

            const embed = new EmbedBuilder()
                .setTitle(`<:532883cash:1526527010942484510> Blackjack vs ${npc.name} | Bet: $${currentBet}`)
                .setDescription(`**${statusMsg}**`)
                .setColor(color as any)
                .setThumbnail(npc.avatarUrl)
                .addFields(
                    {
                        name: `${user.username}'s Hand (Score: ${pScore})`,
                        value: '*(Cards displayed above)*',
                        inline: true
                    },
                    {
                        name: `${npc.name}'s Hand (Score: ${hideDealerCard ? '?' : dScore})`,
                        value: '*(Cards displayed above)*',
                        inline: true
                    }
                )
                .setFooter({ text: 'Card Minigame Engine' });
                
            const content = `<@${user.id}>'s Blackjack Game\n# ${pHandStr}\n\n${npc.name}'s Hand\n# ${dHandStr}`;

            return { content, embeds: [embed], components: [getButtons(playerState !== 'playing')] };
        };

        const getButtons = (disabled: boolean) => {
            if (disabled) {
                return new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('replay_100').setLabel('Replay $100').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('replay_500').setLabel('Replay $500').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('replay_1000').setLabel('Replay $1000').setStyle(ButtonStyle.Success)
                );
            }

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('hit')
                    .setLabel('Hit')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stand')
                    .setLabel('Stand')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            if (isFirstTurn && eco.balance >= currentBet * 2) {
                 row.addComponents(
                     new ButtonBuilder()
                         .setCustomId('double_down')
                         .setLabel('Double Down')
                         .setStyle(ButtonStyle.Danger)
                 );
            }
            return row;
        };

        const runDealerLogic = () => {
            let dScore = calculateScore(dealerHand);
            while (dScore < 17) {
                dealerHand.push(deck.pop()!);
                dScore = calculateScore(dealerHand);
            }
        };

        // Start first round
        deck = createDeck();
        playerHand = [deck.pop()!, deck.pop()!];
        dealerHand = [deck.pop()!, deck.pop()!];
        playerScore = calculateScore(playerHand);
        
        if (playerScore === 21) {
            playerState = 'blackjack';
            runDealerLogic();
            await processGameEnd();
        }

        const publicMessage = await channel.send(generateMessagePayload(playerState === 'playing'));

        const gameCollector = publicMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        gameCollector.on('collect', async (i: any) => {
            if (i.user.id !== user.id) {
                await i.reply({ content: 'These buttons are not for you!', ephemeral: true });
                return;
            }

            if (i.customId.startsWith('replay_')) {
                currentBet = parseInt(i.customId.split('_')[1]);
                eco = await getUserEconomy(user.id);
                if (eco.balance < currentBet) {
                    await i.reply({ content: `You don't have enough money to bet $${currentBet}! Your balance is $${eco.balance}.`, ephemeral: true });
                    return;
                }

                deck = createDeck();
                playerHand = [deck.pop()!, deck.pop()!];
                dealerHand = [deck.pop()!, deck.pop()!];
                playerScore = calculateScore(playerHand);
                isFirstTurn = true;
                
                if (playerScore === 21) {
                    playerState = 'blackjack';
                    runDealerLogic();
                    await processGameEnd();
                    await i.update(generateMessagePayload(false));
                } else {
                    playerState = 'playing';
                    await i.update(generateMessagePayload(true));
                }
            } else if (i.customId === 'hit') {
                isFirstTurn = false;
                playerHand.push(deck.pop()!);
                playerScore = calculateScore(playerHand);
                
                if (playerScore > 21) {
                    playerState = 'bust';
                    await processGameEnd();
                    await i.update(generateMessagePayload(false));
                } else if (playerScore === 21) {
                    playerState = 'stand';
                    runDealerLogic();
                    await processGameEnd();
                    await i.update(generateMessagePayload(false));
                } else {
                    await i.update(generateMessagePayload(true));
                }
            } else if (i.customId === 'stand') {
                isFirstTurn = false;
                playerState = 'stand';
                runDealerLogic();
                await processGameEnd();
                await i.update(generateMessagePayload(false));
            } else if (i.customId === 'double_down') {
                isFirstTurn = false;
                currentBet *= 2;
                playerHand.push(deck.pop()!);
                playerScore = calculateScore(playerHand);
                
                if (playerScore > 21) {
                    playerState = 'bust';
                } else {
                    playerState = 'stand';
                    runDealerLogic();
                }
                await processGameEnd();
                await i.update(generateMessagePayload(false));
            }
            
            gameCollector.resetTimer();
        });

        gameCollector.on('end', async (_: any, reason: any) => {
            if (reason === 'time') {
                await publicMessage.edit({
                    components: []
                }).catch(() => {});
            }
        });
    };
}
