const payload = {
  "embeds": [
    {
      "title": "🎉 Kin Chat v1.1 - Minigame Update!",
      "description": "Hey everyone! We've just rolled out an awesome new update focusing on interactive minigames and smarter AI.\n\n### 🃏 Blackjack is Here!\nYou can now play Blackjack against our NPCs! We've added a fully functioning economy system.\n- **Starting Balance:** Everyone starts with **$5,000**.\n- **Features:** Place your bets, hit, stand, or double down!\n\n### 💫 Seamless NPC Integration\nYou don't even need to use the `/blackjack` command! You can simply ask an NPC to play (e.g., *\"Hey Sali, let's play blackjack!\"*), and they'll instantly set up the game for you.\n\n### 🧠 Enhanced AI Memory\nWe've tweaked the NPC brains! They now have better memory retention for your conversations and will provide even cooler, more natural responses—including taunting you if you lose a hand of Blackjack or congratulating you if you win!",
      "color": 3066993,
      "thumbnail": {
        "url": "https://cdn.discordapp.com/emojis/1526532999137722468.gif?size=128"
      },
      "footer": {
        "text": "Card Minigame Engine & AI Updates"
      }
    }
  ]
};

fetch("https://discord.com/api/webhooks/1526567498923642972/MyKbniOHLVjeaFNEmAqIxnyMGbhPZFwDK8b337k5T_lbIsvfDXzqM_Du-dOigZ4FPVSN", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
}).then(() => console.log("Done")).catch(console.error);
