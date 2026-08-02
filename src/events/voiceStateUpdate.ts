import { VoiceState } from "discord.js";
import type { StudySession } from "../models/StudySession";
import { saveStudySession } from "../database/database";

const activeSessions = new Map<string, StudySession>();

export default async function voiceStateUpdate(
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

    await saveStudySession({
      userId: session.userId,
      username: session.username,
      channelId: session.channelId,
      channelName: session.channelName,
      joinedAt: session.joinedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      duration: duration,
    });

    activeSessions.delete(member.id);
  }
}