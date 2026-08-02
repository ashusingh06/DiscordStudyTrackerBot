import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getUserSessions } from "../database/database";

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const username = interaction.user.username;

  try {
    const userSessions = await getUserSessions(userId);

    if (userSessions.length === 0) {
      return interaction.reply({
        content: "No study sessions found.",
        ephemeral: true,
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    let todaySeconds = 0;
    let weekSeconds = 0;
    let monthSeconds = 0;
    let lifetimeSeconds = 0;

    for (const session of userSessions) {
      const endedTime = new Date(session.endedAt).getTime();
      if (isNaN(endedTime)) continue;

      const duration = session.duration || 0;
      lifetimeSeconds += duration;

      if (endedTime >= startOfToday) todaySeconds += duration;
      if (endedTime >= startOfWeek) weekSeconds += duration;
      if (endedTime >= startOfMonth) monthSeconds += duration;
    }

    const formatDuration = (sec: number) => {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = sec % 60;
      return `⏱️ **${hrs}h ${mins}m ${secs}s**`;
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📚 Study Statistics for ${username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "📅 Today", value: formatDuration(todaySeconds), inline: true },
        { name: "📆 This Week (Last 7d)", value: formatDuration(weekSeconds), inline: true },
        { name: "📅 This Month (Last 30d)", value: formatDuration(monthSeconds), inline: true },
        { name: "🏆 Lifetime Study Time", value: formatDuration(lifetimeSeconds), inline: false }
      )
      .setTimestamp()
      .setFooter({ text: "Keep up the great work! 💪" });

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error executing stats command:", error);
    return interaction.reply({
      content: "An error occurred while retrieving your study statistics.",
      ephemeral: true,
    });
  }
}

export default {
  name: "stats",
  description: "View study statistics",
  execute,
};
