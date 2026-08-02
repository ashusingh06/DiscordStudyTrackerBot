import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import voiceStateUpdate from "./events/voiceStateUpdate";
import statsCommand from "./commands/stats";
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
client.on("voiceStateUpdate", voiceStateUpdate);

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === statsCommand.name) {
    try {
      await statsCommand.execute(interaction);
    } catch (error) {
      console.error("Error executing command:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      }
    }
  }
});

client.once("clientReady", async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Logged in as ${client.user?.tag}`);
  console.log("🚀 Study Tracker Bot is Online");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const commands = [
      {
        name: statsCommand.name,
        description: statsCommand.description,
      },
    ];

    const guildId = process.env.GUILD_ID;
    if (guildId && guildId !== "your_guild_id_here") {
      const guild = await client.guilds.fetch(guildId);
      await guild.commands.set(commands);
      console.log(`Successfully registered slash commands for guild: ${guild.name}`);
    } else {
      await client.application?.commands.set(commands);
      console.log("Successfully registered slash commands globally.");
    }
  } catch (error) {
    console.error("Failed to register application commands:", error);
  }
});

client.login(process.env.DISCORD_TOKEN);