import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Logged in as ${client.user?.tag}`);
  console.log("🚀 Study Tracker Bot is Online");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

client.login(process.env.DISCORD_TOKEN);//# sourceMappingURL=index.d.ts.map