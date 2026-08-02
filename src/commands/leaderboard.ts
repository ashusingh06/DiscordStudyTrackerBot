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

interface UserStats {
  userId: string;
  username: string;
  totalDuration: number;
}

const rankEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function formatDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return `${hrs}h ${mins}m ${secs}s`;
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

async function execute(interaction: ChatInputCommandInteraction) {
  const dataPath = path.join(process.cwd(), "study-data.json");

  // If no data file exists, show a friendly embed
  if (!fs.existsSync(dataPath)) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🏆 Study Leaderboard")
      .setDescription("No leaderboard data found yet. Start studying in a voice channel to appear here!")
      .setTimestamp()
      .setFooter({ text: "Keep studying! 💪" });

    return interaction.reply({ embeds: [emptyEmbed] });
  }

  try {
    const fileStats = fs.statSync(dataPath);
    const lastUpdated = fileStats.mtime;
    const fileContent = fs.readFileSync(dataPath, "utf-8");
    
    let completedSessions: CompletedSession[];
    try {
      completedSessions = parseStudyData(fileContent);
    } catch {
      const corruptEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("⚠️ Leaderboard Error")
        .setDescription("Could not load leaderboard data. The study database file might be corrupted.")
        .setTimestamp();
      return interaction.reply({ embeds: [corruptEmbed], ephemeral: true });
    }

    const userMap = new Map<string, { username: string; totalDuration: number }>();

    for (const session of completedSessions) {
      const current = userMap.get(session.userId) || { username: session.username, totalDuration: 0 };
      current.totalDuration += session.duration;
      current.username = session.username; // update to latest username
      userMap.set(session.userId, current);
    }

    const leaderboardList: UserStats[] = [];
    userMap.forEach((value, userId) => {
      leaderboardList.push({
        userId,
        username: value.username,
        totalDuration: value.totalDuration,
      });
    });

    if (leaderboardList.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🏆 Study Leaderboard")
        .setDescription("No leaderboard data found yet. Start studying in a voice channel to appear here!")
        .setTimestamp()
        .setFooter({ text: "Keep studying! 💪" });

      return interaction.reply({ embeds: [emptyEmbed] });
    }

    // Sort descending
    leaderboardList.sort((a, b) => b.totalDuration - a.totalDuration);

    // Calculate metadata
    const totalTrackedUsers = leaderboardList.length;
    const totalSeconds = leaderboardList.reduce((acc, curr) => acc + curr.totalDuration, 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

    // User's own rank info
    const userIndex = leaderboardList.findIndex((u) => u.userId === interaction.user.id);
    let userRankText = "You haven't studied yet.";
    if (userIndex !== -1) {
      let userRank = 1;
      let prevDur = -1;
      for (let i = 0; i <= userIndex; i++) {
        const item = leaderboardList[i];
        if (item && item.totalDuration !== prevDur) {
          userRank = i + 1;
          prevDur = item.totalDuration;
        }
      }
      const userStat = leaderboardList[userIndex];
      if (userStat) {
        userRankText = `Your Rank: #${userRank} (${formatDuration(userStat.totalDuration)})`;
      }
    }

    const top10 = leaderboardList.slice(0, 10);

    let rank = 1;
    let prevDuration = -1;
    const embedDescription = top10
      .map((user, index) => {
        if (user.totalDuration !== prevDuration) {
          rank = index + 1;
          prevDuration = user.totalDuration;
        }
        const emoji = rankEmojis[rank - 1] ?? `${rank}.`;
        const highlight = user.userId === interaction.user.id ? " ⭐" : "";
        return `${emoji} **${user.username}**${highlight} - \`${formatDuration(user.totalDuration)}\``;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🏆 Study Leaderboard - Top 10")
      .setDescription(embedDescription)
      .addFields(
        { name: "👥 Tracked Users", value: `${totalTrackedUsers}`, inline: true },
        { name: "⏱️ Total Study Time", value: `${totalHours} hrs`, inline: true },
        { name: "🕒 Last Updated", value: `<t:${Math.floor(lastUpdated.getTime() / 1000)}:R>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Keep studying! | ${userRankText}` });

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error reading study-data.json for leaderboard:", error);
    const errorEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("⚠️ Leaderboard Error")
      .setDescription("An error occurred while loading the leaderboard.")
      .setTimestamp();
    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}

export default {
  name: "leaderboard",
  description: "View the top 10 study leaders",
  execute
};
