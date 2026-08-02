import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";

interface CompletedSession {
  userId: string;
  username: string;
  joinedAt: string;
  endedAt: string;
  duration: number;
}

interface GoalEntry {
  goalHours: number;
}

interface GoalData {
  [userId: string]: GoalEntry;
}

function formatTimeHoursMins(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
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
  const userId = interaction.user.id;
  const goalPath = path.join(process.cwd(), "goal-data.json");
  const studyPath = path.join(process.cwd(), "study-data.json");

  // Read goal from goal-data.json
  let goalHours = 0;
  if (fs.existsSync(goalPath)) {
    try {
      const fileContent = fs.readFileSync(goalPath, "utf-8");
      const parsedData = JSON.parse(fileContent) as GoalData;
      const entry = parsedData[userId];
      if (entry) {
        goalHours = entry.goalHours;
      }
    } catch (error) {
      console.error("Error reading goal-data.json:", error);
    }
  }

  if (goalHours <= 0) {
    return interaction.reply({
      content: "You haven't set a daily goal yet. Use `/goal` to set one!",
      ephemeral: true,
    });
  }

  // Calculate today's study time
  let todaySeconds = 0;
  if (fs.existsSync(studyPath)) {
    try {
      const fileContent = fs.readFileSync(studyPath, "utf-8");
      const allSessions = parseStudyData(fileContent);
      const userSessions = allSessions.filter((s) => s.userId === userId);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      for (const session of userSessions) {
        const endedTime = new Date(session.endedAt).getTime();
        if (!isNaN(endedTime) && endedTime >= startOfToday) {
          todaySeconds += session.duration;
        }
      }
    } catch (error) {
      console.error("Error parsing study-data.json in mygoal:", error);
    }
  }

  const goalSeconds = goalHours * 3600;
  const percentage = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));

  // Progress bar calculation
  const totalBlocks = 10;
  const filledBlocks = Math.min(totalBlocks, Math.floor(percentage / 10));
  const emptyBlocks = totalBlocks - filledBlocks;
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

  // Formatting results
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
}

export default {
  name: "mygoal",
  description: "View your daily study goal progress",
  execute,
};
