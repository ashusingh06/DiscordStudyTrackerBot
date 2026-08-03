import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";

import voiceStateUpdate from "./events/voiceStateUpdate";
import statsCommand from "./commands/stats";
import leaderboardCommand from "./commands/leaderboard";
import profileCommand from "./commands/profile";
import goalCommand from "./commands/goal";
import mygoalCommand from "./commands/mygoal";
import attendanceCommand from "./commands/attendance";
import streakCommand from "./commands/streak";
import { initDatabase } from "./database/database";

dotenv.config();

/* -------------------- Render Health Server -------------------- */
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, res) => {
  res.send("Study Tracker Bot is running!");
});

app.listen(PORT, () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});
/* -------------------------------------------------------------- */

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

  try {
    switch (interaction.commandName) {
      case statsCommand.name:
        await statsCommand.execute(interaction);
        break;

      case leaderboardCommand.name:
        await leaderboardCommand.execute(interaction);
        break;

      case profileCommand.name:
        await profileCommand.execute(interaction);
        break;

      case goalCommand.name:
        await goalCommand.execute(interaction);
        break;

      case mygoalCommand.name:
        await mygoalCommand.execute(interaction);
        break;

      case attendanceCommand.name:
        await attendanceCommand.execute(interaction);
        break;

      case streakCommand.name:
        await streakCommand.execute(interaction);
        break;
    }
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
});

client.once("clientReady", async () => {
  await initDatabase();

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
      {
        name: leaderboardCommand.name,
        description: leaderboardCommand.description,
      },
      {
        name: profileCommand.name,
        description: profileCommand.description,
      },
      {
        name: goalCommand.name,
        description: goalCommand.description,
        options: goalCommand.options,
      },
      {
        name: mygoalCommand.name,
        description: mygoalCommand.description,
      },
      {
        name: attendanceCommand.name,
        description: attendanceCommand.description,
      },
      {
        name: streakCommand.name,
        description: streakCommand.description,
      },
    ];

    const guildId = process.env.GUILD_ID;

    if (guildId && guildId !== "your_guild_id_here") {
      const guild = await client.guilds.fetch(guildId);
      await guild.commands.set(commands);
      console.log(
        `Successfully registered slash commands for guild: ${guild.name}`
      );
    } else {
      await client.application?.commands.set(commands);
      console.log("Successfully registered slash commands globally.");
    }
  } catch (error) {
    console.error("Failed to register application commands:", error);
  }
});

client.login(process.env.DISCORD_TOKEN);