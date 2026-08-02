import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});
client.once('ready', () => {
    console.log(`🚀 StudyTrackerBot is online! Logged in as ${client.user?.tag}`);
});
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Error: DISCORD_TOKEN is not defined in the .env file.');
    process.exit(1);
}
client.login(token).catch((err) => {
    console.error('❌ Failed to login to Discord:', err);
});
//# sourceMappingURL=index.js.map