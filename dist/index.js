"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const voiceStateUpdate_1 = __importDefault(require("./events/voiceStateUpdate"));
const stats_1 = __importDefault(require("./commands/stats"));
const leaderboard_1 = __importDefault(require("./commands/leaderboard"));
const profile_1 = __importDefault(require("./commands/profile"));
const goal_1 = __importDefault(require("./commands/goal"));
const mygoal_1 = __importDefault(require("./commands/mygoal"));
const attendance_1 = __importDefault(require("./commands/attendance"));
const streak_1 = __importDefault(require("./commands/streak"));
const database_1 = require("./database/database");
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
client.on("voiceStateUpdate", voiceStateUpdate_1.default);
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    if (interaction.commandName === stats_1.default.name) {
        try {
            await stats_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
    else if (interaction.commandName === leaderboard_1.default.name) {
        try {
            await leaderboard_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
    else if (interaction.commandName === profile_1.default.name) {
        try {
            await profile_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
    else if (interaction.commandName === goal_1.default.name) {
        try {
            await goal_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
    else if (interaction.commandName === mygoal_1.default.name) {
        try {
            await mygoal_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
    else if (interaction.commandName === attendance_1.default.name) {
        try {
            await attendance_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
    else if (interaction.commandName === streak_1.default.name) {
        try {
            await streak_1.default.execute(interaction);
        }
        catch (error) {
            console.error("Error executing command:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "There was an error executing this command.",
                    ephemeral: true,
                });
            }
        }
    }
});
client.once("clientReady", async () => {
    await (0, database_1.initDatabase)();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Logged in as ${client.user?.tag}`);
    console.log("🚀 Study Tracker Bot is Online");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    try {
        const commands = [
            {
                name: stats_1.default.name,
                description: stats_1.default.description,
            },
            {
                name: leaderboard_1.default.name,
                description: leaderboard_1.default.description,
            },
            {
                name: profile_1.default.name,
                description: profile_1.default.description,
            },
            {
                name: goal_1.default.name,
                description: goal_1.default.description,
                options: goal_1.default.options,
            },
            {
                name: mygoal_1.default.name,
                description: mygoal_1.default.description,
            },
            {
                name: attendance_1.default.name,
                description: attendance_1.default.description,
            },
            {
                name: streak_1.default.name,
                description: streak_1.default.description,
            },
        ];
        const guildId = process.env.GUILD_ID;
        if (guildId && guildId !== "your_guild_id_here") {
            const guild = await client.guilds.fetch(guildId);
            await guild.commands.set(commands);
            console.log(`Successfully registered slash commands for guild: ${guild.name}`);
        }
        else {
            await client.application?.commands.set(commands);
            console.log("Successfully registered slash commands globally.");
        }
    }
    catch (error) {
        console.error("Failed to register application commands:", error);
    }
});
client.login(process.env.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map