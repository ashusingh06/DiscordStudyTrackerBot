import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getUserSessions, CompletedSession } from "../database/database";

interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  lastStudyText: string;
  totalStudyDays: number;
  lifetimeSeconds: number;
}

function formatDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

function getStartOfDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function calculateStreakData(userSessions: CompletedSession[]): StreakResult | null {
  if (userSessions.length === 0) return null;

  let lifetimeSeconds = 0;
  const dailyDurationMap = new Map<number, number>();
  let latestEndedDate: Date | null = null;

  for (const session of userSessions) {
    lifetimeSeconds += session.duration;
    const endedDate = new Date(session.endedAt);
    if (!isNaN(endedDate.getTime())) {
      if (!latestEndedDate || endedDate > latestEndedDate) {
        latestEndedDate = endedDate;
      }
      const dayKey = getStartOfDayTimestamp(endedDate);
      dailyDurationMap.set(dayKey, (dailyDurationMap.get(dayKey) || 0) + session.duration);
    }
  }

  // Filter dates with at least 30 minutes (1800 seconds)
  const validDayTimestamps: number[] = [];
  dailyDurationMap.forEach((duration, dayTs) => {
    if (duration >= 1800) {
      validDayTimestamps.push(dayTs);
    }
  });

  validDayTimestamps.sort((a, b) => a - b);
  const totalStudyDays = validDayTimestamps.length;

  // Calculate Best Streak
  let bestStreak = 0;
  let currentRun = 0;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (let i = 0; i < validDayTimestamps.length; i++) {
    const currentTs = validDayTimestamps[i];
    const prevTs = i > 0 ? validDayTimestamps[i - 1] : undefined;

    if (currentTs !== undefined) {
      if (prevTs !== undefined && Math.round((currentTs - prevTs) / ONE_DAY_MS) === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
      bestStreak = Math.max(bestStreak, currentRun);
    }
  }

  // Calculate Current Streak
  const now = new Date();
  const todayTs = getStartOfDayTimestamp(now);
  const yesterdayTs = todayTs - ONE_DAY_MS;

  const validSet = new Set(validDayTimestamps);
  let currentStreak = 0;

  let checkTs: number | null = null;
  if (validSet.has(todayTs)) {
    checkTs = todayTs;
  } else if (validSet.has(yesterdayTs)) {
    checkTs = yesterdayTs;
  }

  if (checkTs !== null) {
    while (validSet.has(checkTs)) {
      currentStreak++;
      checkTs -= ONE_DAY_MS;
    }
  }

  // Last Study Date Text
  let lastStudyText = "Never";
  if (latestEndedDate) {
    const latestTs = getStartOfDayTimestamp(latestEndedDate);
    if (latestTs === todayTs) {
      lastStudyText = "Today";
    } else if (latestTs === yesterdayTs) {
      lastStudyText = "Yesterday";
    } else {
      lastStudyText = latestEndedDate.toLocaleDateString();
    }
  }

  return {
    currentStreak,
    bestStreak,
    lastStudyText,
    totalStudyDays,
    lifetimeSeconds,
  };
}

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;

  try {
    const userSessions = await getUserSessions(userId);

    const streakData = calculateStreakData(userSessions);
    if (!streakData || (streakData.totalStudyDays === 0 && streakData.lifetimeSeconds === 0)) {
      return interaction.reply({
        content: "No streak data found.",
        ephemeral: true,
      });
    }

    let bonusMessage = "";
    if (streakData.currentStreak > 0 && streakData.currentStreak === streakData.bestStreak) {
      bonusMessage = "🎉 **You're on your best streak!**\n\n";
    } else if (streakData.currentStreak > 0 && streakData.currentStreak === streakData.bestStreak - 1) {
      bonusMessage = "🔥 **One more day to beat your personal record!**\n\n";
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF6B00)
      .setTitle("🔥 Study Streak")
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(bonusMessage ? bonusMessage : null)
      .addFields(
        { name: "🔥 Current Streak", value: `**${streakData.currentStreak} Days**`, inline: true },
        { name: "🏆 Best Streak", value: `**${streakData.bestStreak} Days**`, inline: true },
        { name: "📅 Last Study", value: streakData.lastStudyText, inline: true },
        { name: "📚 Total Study Days", value: `${streakData.totalStudyDays} days`, inline: true },
        { name: "⏱ Lifetime Study", value: formatDuration(streakData.lifetimeSeconds), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "Keep the flame burning! 🔥" });

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error executing streak command:", error);
    return interaction.reply({
      content: "⚠️ An error occurred while loading your streak data.",
      ephemeral: true,
    });
  }
}

export default {
  name: "streak",
  description: "View your current and best study streaks",
  execute,
};
