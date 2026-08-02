import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { setUserGoal } from "../database/database";

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const hours = interaction.options.getNumber("hours", true);

  if (hours < 1 || hours > 24) {
    return interaction.reply({
      content: "⚠️ Your daily study goal must be between 1 and 24 hours.",
      ephemeral: true,
    });
  }

  try {
    await setUserGoal(userId, hours);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🎯 Daily Goal Set")
      .setDescription(`Your daily study goal has been set to **${hours} hours**!`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error setting user goal:", error);
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
