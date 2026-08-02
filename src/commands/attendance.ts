import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getUserSessions, CompletedSession } from "../database/database";

interface AttendanceDay {
  day: number;
  status: "Present" | "Absent";
  secondsStudied: number;
}

interface AttendanceStats {
  days: AttendanceDay[];
  presentCount: number;
  absentCount: number;
  studyDaysCount: number;
  percentage: number;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function calculateAttendance(userSessions: CompletedSession[]): AttendanceStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const dailySeconds: Record<number, number> = {};
  for (let d = 1; d <= currentDay; d++) {
    dailySeconds[d] = 0;
  }

  const studyDays = new Set<number>();

  for (const session of userSessions) {
    const endedDate = new Date(session.endedAt);
    if (
      !isNaN(endedDate.getTime()) &&
      endedDate.getFullYear() === currentYear &&
      endedDate.getMonth() === currentMonth
    ) {
      const day = endedDate.getDate();
      if (day >= 1 && day <= currentDay) {
        dailySeconds[day] = (dailySeconds[day] || 0) + session.duration;
        if (session.duration > 0) {
          studyDays.add(day);
        }
      }
    }
  }

  const days: AttendanceDay[] = [];
  let presentCount = 0;
  let absentCount = 0;

  for (let d = 1; d <= currentDay; d++) {
    const seconds = dailySeconds[d] || 0;
    const isPresent = seconds >= 1800; // 30 minutes
    if (isPresent) {
      presentCount++;
    } else {
      absentCount++;
    }

    days.push({
      day: d,
      status: isPresent ? "Present" : "Absent",
      secondsStudied: seconds,
    });
  }

  const percentage = currentDay > 0 ? Math.round((presentCount / currentDay) * 100) : 0;

  return {
    days,
    presentCount,
    absentCount,
    studyDaysCount: studyDays.size,
    percentage,
  };
}

async function execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;

  try {
    const userSessions = await getUserSessions(userId);

    if (userSessions.length === 0) {
      return interaction.reply({
        content: "No attendance data found.",
        ephemeral: true,
      });
    }

    const stats = calculateAttendance(userSessions);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthName = monthNames[now.getMonth()] || "Unknown Month";

    const daysText = stats.days
      .map((d) => {
        const dayStr = d.day.toString().padStart(2, "0");
        const emoji = d.status === "Present" ? "✅" : "❌";
        return `${dayStr} ${emoji}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📅 Attendance: ${currentMonthName} ${currentYear}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(daysText)
      .addFields(
        { name: "📈 Attendance Rate", value: `**${stats.percentage}%**`, inline: true },
        { name: "✅ Present Days", value: `${stats.presentCount} days`, inline: true },
        { name: "❌ Absent Days", value: `${stats.absentCount} days`, inline: true },
        { name: "📚 Total Study Days", value: `${stats.studyDaysCount} days`, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: "Keep showing up every day! 📚" });

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error executing attendance command:", error);
    return interaction.reply({
      content: "⚠️ An error occurred while loading your attendance data.",
      ephemeral: true,
    });
  }
}

export default {
  name: "attendance",
  description: "View your study attendance for the current month",
  execute,
};
