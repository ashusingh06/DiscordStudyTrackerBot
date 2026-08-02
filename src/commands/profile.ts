import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";

interface CompletedSession {
  userId: string;
  username: string;
  joinedAt: string;
  endedAt: string;
  duration: number;
  channelId?: string | undefined;
  channelName?: string | undefined;
}

interface ProfileStats {
  username: string;
  todayDuration: number;
  weeklyDuration: number;
  monthlyDuration: number;
  lifetimeDuration: number;
  totalSessions: number;
  avgSessionDuration: number;
  favoriteChannel: string;
  firstStudyDate: Date | null;
  lastStudyDate: Date | null;
}

interface UserRankInfo {
  rank: number;
  totalUsers: number;
}

function formatDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return `${hrs}h ${mins}m ${secs}s`;
}

function createNoDataEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📚 Study Profile")
    .setDescription("No study sessions found.\nJoin a study voice channel to begin tracking.")
    .setTimestamp();
}

function parseStudyData(fileContent: string): CompletedSession[] {
  const parsed = JSON.parse(fileContent);
  const sessionsList: CompletedSession[] = [];

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof item.userId === "string" &&
        typeof item.username === "string" &&
        typeof item.duration === "number"
      ) {
        sessionsList.push({
          userId: item.userId,
          username: item.username,
          joinedAt: typeof item.joinedAt === "string" ? item.joinedAt : new Date().toISOString(),
          endedAt: typeof item.endedAt === "string" ? item.endedAt : new Date().toISOString(),
          duration: item.duration,
          channelId: typeof item.channelId === "string" ? item.channelId : undefined,
          channelName: typeof item.channelName === "string" ? item.channelName : undefined
        });
      }
    }
  } else if (parsed && typeof parsed === "object") {
    for (const [userId, entry] of Object.entries(parsed)) {
      if (!entry) continue;

      if (Array.isArray(entry)) {
        for (const item of entry) {
          if (item && typeof item === "object" && typeof item.duration === "number") {
            sessionsList.push({
              userId: userId,
              username: typeof item.username === "string" ? item.username : "Unknown User",
              joinedAt: typeof item.joinedAt === "string" ? item.joinedAt : new Date().toISOString(),
              endedAt: typeof item.endedAt === "string" ? item.endedAt : new Date().toISOString(),
              duration: item.duration,
              channelId: typeof item.channelId === "string" ? item.channelId : undefined,
              channelName: typeof item.channelName === "string" ? item.channelName : undefined
            });
          }
        }
      } else if (typeof entry === "object") {
        const entryObj = entry as Record<string, unknown>;
        const username = typeof entryObj.username === "string" ? entryObj.username : "Unknown User";
        const sessions = entryObj.sessions;
        if (Array.isArray(sessions)) {
          for (const item of sessions) {
            if (item && typeof item === "object" && typeof item.duration === "number") {
              const itemObj = item as Record<string, unknown>;
              sessionsList.push({
                userId: userId,
                username: typeof itemObj.username === "string" ? itemObj.username : username,
                joinedAt: typeof itemObj.joinedAt === "string" ? itemObj.joinedAt : new Date().toISOString(),
                endedAt: typeof itemObj.endedAt === "string" ? itemObj.endedAt : new Date().toISOString(),
                duration: item.duration,
                channelId: typeof itemObj.channelId === "string" ? itemObj.channelId : undefined,
                channelName: typeof itemObj.channelName === "string" ? itemObj.channelName : undefined
              });
            }
          }
        }
      }
    }
  }

  return sessionsList;
}

function calculateProfileStats(userSessions: CompletedSession[]): ProfileStats {
  let todayDuration = 0;
  let weeklyDuration = 0;
  let monthlyDuration = 0;
  let lifetimeDuration = 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const startOfMonth = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const channelCounts: Record<string, number> = {};
  let firstStudyDate: Date | null = null;
  let lastStudyDate: Date | null = null;
  let username = "Unknown User";

  for (const session of userSessions) {
    const duration = session.duration;
    lifetimeDuration += duration;

    const endedTime = new Date(session.endedAt).getTime();
    const joinedTime = new Date(session.joinedAt).getTime();

    if (!isNaN(endedTime)) {
      if (endedTime >= startOfToday) todayDuration += duration;
      if (endedTime >= startOfWeek) weeklyDuration += duration;
      if (endedTime >= startOfMonth) monthlyDuration += duration;

      const endedDate = new Date(session.endedAt);
      if (!lastStudyDate || endedDate > lastStudyDate) {
        lastStudyDate = endedDate;
      }
    }

    if (!isNaN(joinedTime)) {
      const joinedDate = new Date(session.joinedAt);
      if (!firstStudyDate || joinedDate < firstStudyDate) {
        firstStudyDate = joinedDate;
      }
    }

    if (session.username) {
      username = session.username;
    }

    if (session.channelName) {
      channelCounts[session.channelName] = (channelCounts[session.channelName] || 0) + 1;
    }
  }

  let favoriteChannel = "None";
  let maxCount = 0;
  for (const [channel, count] of Object.entries(channelCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteChannel = channel;
    }
  }

  const totalSessions = userSessions.length;
  const avgSessionDuration = totalSessions > 0 ? Math.round(lifetimeDuration / totalSessions) : 0;

  return {
    username,
    todayDuration,
    weeklyDuration,
    monthlyDuration,
    lifetimeDuration,
    totalSessions,
    avgSessionDuration,
    favoriteChannel,
    firstStudyDate,
    lastStudyDate
  };
}

function calculateUserRank(allSessions: CompletedSession[], targetUserId: string): UserRankInfo {
  const userMap = new Map<string, number>();
  for (const s of allSessions) {
    userMap.set(s.userId, (userMap.get(s.userId) || 0) + s.duration);
  }

  const sortedList = Array.from(userMap.entries()).map(([userId, duration]) => ({
    userId,
    duration
  }));

  sortedList.sort((a, b) => b.duration - a.duration);

  let rank = 1;
  let prevDuration = -1;
  let targetRank = 0;

  for (let i = 0; i < sortedList.length; i++) {
    const current = sortedList[i];
    if (current) {
      if (current.duration !== prevDuration) {
        rank = i + 1;
        prevDuration = current.duration;
      }
      if (current.userId === targetUserId) {
        targetRank = rank;
      }
    }
  }

  return {
    rank: targetRank,
    totalUsers: sortedList.length
  };
}

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const dataPath = path.join(process.cwd(), "study-data.json");

  if (!fs.existsSync(dataPath)) {
    return interaction.reply({ embeds: [createNoDataEmbed()] });
  }

  try {
    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const allSessions = parseStudyData(fileContent);
    const userSessions = allSessions.filter(s => s.userId === userId);

    if (userSessions.length === 0) {
      return interaction.reply({ embeds: [createNoDataEmbed()] });
    }

    const stats = calculateProfileStats(userSessions);
    const rankInfo = calculateUserRank(allSessions, userId);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📚 Study Profile - ${stats.username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "👤 User", value: `${interaction.user.toString()}`, inline: true },
        { name: "🏆 Rank", value: `Rank #${rankInfo.rank} of ${rankInfo.totalUsers} users`, inline: true },
        { name: "📈 Total Sessions", value: `${stats.totalSessions} completed`, inline: true },
        { name: "📅 First Session", value: stats.firstStudyDate ? stats.firstStudyDate.toLocaleDateString() : "Never", inline: true },
        { name: "🕒 Last Active", value: stats.lastStudyDate ? `<t:${Math.floor(stats.lastStudyDate.getTime() / 1000)}:R>` : "Never", inline: true },
        { name: "🎧 Favorite VC", value: `\`${stats.favoriteChannel}\``, inline: true },
        { name: "⏱️ Average Session", value: `\`${formatDuration(stats.avgSessionDuration)}\``, inline: true },
        { name: "📅 Today", value: `\`${formatDuration(stats.todayDuration)}\``, inline: true },
        { name: "📆 This Week", value: `\`${formatDuration(stats.weeklyDuration)}\``, inline: true },
        { name: "📅 This Month", value: `\`${formatDuration(stats.monthlyDuration)}\``, inline: true },
        { name: "🏆 Lifetime Study Time", value: `**${formatDuration(stats.lifetimeDuration)}**`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: "Keep studying and tracking your goals! 💪" });

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error executing profile command:", error);
    const corruptEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("⚠️ Profile Error")
      .setDescription("Could not load profile. The study database file might be corrupted.")
      .setTimestamp();
    return interaction.reply({ embeds: [corruptEmbed], ephemeral: true });
  }
}

export default {
  name: "profile",
  description: "View your study profile and detailed stats",
  execute
};
