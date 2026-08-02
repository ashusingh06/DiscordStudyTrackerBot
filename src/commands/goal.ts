import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";

interface GoalEntry {
  goalHours: number;
}

interface GoalData {
  [userId: string]: GoalEntry;
}

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const hours = interaction.options.getNumber("hours", true);

  if (hours < 1 || hours > 24) {
    return interaction.reply({
      content: "⚠️ Your daily study goal must be between 1 and 24 hours.",
      ephemeral: true,
    });
  }

  const dataPath = path.join(process.cwd(), "goal-data.json");
  let goalData: GoalData = {};

  if (fs.existsSync(dataPath)) {
    try {
      const fileContent = fs.readFileSync(dataPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        goalData = parsed as GoalData;
      }
    } catch (error) {
      console.error("Error reading goal-data.json:", error);
      goalData = {};
    }
  }

  goalData[userId] = {
    goalHours: hours,
  };

  try {
    fs.writeFileSync(dataPath, JSON.stringify(goalData, null, 2), "utf-8");
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🎯 Daily Goal Set")
      .setDescription(`Your daily study goal has been set to **${hours} hours**!`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error writing to goal-data.json:", error);
    return interaction.reply({
      content: "⚠️ An error occurred while saving your daily goal.",
      ephemeral: true,
    });
  }
}

export default {
  name: "goal",
  description: "Set your daily study goal",
  options: [
    {
      name: "hours",
      description: "Daily goal in hours (1-24)",
      type: 10, // Number type
      required: true,
    },
  ],
  execute,
};
