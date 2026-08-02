import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getUserGoal, getUserSessions } from "../database/database";

function formatTimeHoursMins(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;

  try {
    const goalHours = await getUserGoal(userId);

    if (!goalHours || goalHours <= 0) {
      return interaction.reply({
        content: "You haven't set a daily goal yet. Use `/goal` to set one!",
        ephemeral: true,
      });
    }

    const userSessions = await getUserSessions(userId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let todaySeconds = 0;
    for (const session of userSessions) {
      const endedTime = new Date(session.endedAt).getTime();
      if (!isNaN(endedTime) && endedTime >= startOfToday) {
        todaySeconds += session.duration;
      }
    }

    const goalSeconds = goalHours * 3600;
    const percentage = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));

    // Progress bar calculation
    const totalBlocks = 10;
    const filledBlocks = Math.min(totalBlocks, Math.floor(percentage / 10));
    const emptyBlocks = totalBlocks - filledBlocks;
    const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

    const currentText = formatTimeHoursMins(todaySeconds);
    const goalText = `${goalHours}h`;
    const isCompleted = todaySeconds >= goalSeconds;

    let remainingText = "";
    if (isCompleted) {
      remainingText = "🎉 **Goal Completed!**";
    } else {
      const remainingSeconds = goalSeconds - todaySeconds;
      remainingText = `⏳ **Remaining:** ${formatTimeHoursMins(remainingSeconds)}`;
    }

    const embed = new EmbedBuilder()
      .setColor(isCompleted ? 0x57F287 : 0x5865F2)
      .setTitle("🎯 Daily Study Goal Progress")
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: "📊 Progress Bar",
          value: `\`${progressBar}\` (${percentage}%)`,
        },
        {
          name: "⏱️ Study Time / Goal",
          value: `**${currentText}** / **${goalText}**`,
          inline: true,
        },
        {
          name: "🏁 Status",
          value: remainingText,
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: "Stay focused and keep learning! 🚀" });

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error executing mygoal command:", error);
    return interaction.reply({
      content: "⚠️ An error occurred while retrieving your daily goal progress.",
      ephemeral: true,
    });
  }
}

export default {
  name: "mygoal",
  description: "View your daily study goal progress",
  execute,
};
