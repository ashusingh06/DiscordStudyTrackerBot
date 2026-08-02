import { VoiceState } from "discord.js";
import type { StudySession } from "../models/StudySession";
import * as fs from "fs";
import * as path from "path";

const activeSessions = new Map<string, StudySession>();
const dataPath = path.join(process.cwd(), "study-data.json");

export default function voiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState
) {
  const member = newState.member ?? oldState.member;

  if (!member) return;

  // ==========================
  // User Joined Voice Channel
  // ==========================
  if (!oldState.channel && newState.channel) {
    activeSessions.set(member.id, {
      userId: member.id,
      username: member.user.username,
      channelId: newState.channel.id,
      channelName: newState.channel.name,
      joinedAt: new Date(),
    });

    console.log(
      `🎧 ${member.user.username} started studying in ${newState.channel.name}`
    );
  }

  // ==========================
  // User Left Voice Channel
  // ==========================
  
  if (oldState.channel && !newState.channel) {
    const session = activeSessions.get(member.id);

    if (!session) return;

    const endedAt = new Date();

    const duration =
      Math.floor((endedAt.getTime() - session.joinedAt.getTime()) / 1000);

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    console.log(
      `📚 ${member.user.username} studied for ${hours}h ${minutes}m ${seconds}s`
    );

    // Save study session to study-data.json
    const sessionRecord = {
      userId: session.userId,
      username: session.username,
      joinedAt: session.joinedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      duration: duration,
    };

    let data: any = {};

    if (fs.existsSync(dataPath)) {
      try {
        const fileContent = fs.readFileSync(dataPath, "utf-8");
        data = JSON.parse(fileContent);
        if (typeof data !== "object" || data === null) {
          data = {};
        }
      } catch (error) {
        console.error("Error reading or parsing study-data.json:", error);
        data = {};
      }
    }

    if (Array.isArray(data)) {
      data.push(sessionRecord);
    } else {
      if (!data[session.userId]) {
        data[session.userId] = [];
      }
      data[session.userId].push(sessionRecord);
    }

    try {
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing to study-data.json:", error);
    }

    activeSessions.delete(member.id);
  }
}