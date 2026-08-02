import type { StudySession } from "../models/StudySession";

/**
 * Singleton manager to handle active study sessions in-memory.
 */
class StudySessionManager {
  private static instance: StudySessionManager | null = null;
  private activeSessions: Map<string, StudySession>;

  /**
   * Private constructor to prevent direct instantiation.
   */
  private constructor() {
    this.activeSessions = new Map<string, StudySession>();
  }

  /**
   * Retrieves the singleton instance of the StudySessionManager.
   */
  public static getInstance(): StudySessionManager {
    if (!StudySessionManager.instance) {
      StudySessionManager.instance = new StudySessionManager();
    }
    return StudySessionManager.instance;
  }

  /**
   * Starts a new study session for a user.
   * If a session is already active for this user, it will be overwritten.
   *
   * @param userId The unique identifier of the user.
   * @param username The username of the user.
   * @param channelId The voice channel identifier.
   * @param channelName The voice channel name.
   * @returns The created StudySession object.
   */
  public startSession(
    userId: string,
    username: string,
    channelId: string,
    channelName: string
  ): StudySession {
    if (!userId || !username || !channelId || !channelName) {
      throw new Error("Missing required parameters to start a study session.");
    }

    const session: StudySession = {
      userId,
      username,
      channelId,
      channelName,
      joinedAt: new Date(),
    };

    this.activeSessions.set(userId, session);
    return { ...session };
  }

  /**
   * Retrieves an active session for a user.
   *
   * @param userId The unique identifier of the user.
   * @returns The active StudySession, or undefined if no session is active.
   */
  public getSession(userId: string): StudySession | undefined {
    const session = this.activeSessions.get(userId);
    return session ? { ...session } : undefined;
  }

  /**
   * Ends an active study session for a user.
   *
   * @param userId The unique identifier of the user.
   * @returns The ended StudySession, or undefined if no session was active.
   */
  public endSession(userId: string): StudySession | undefined {
    const session = this.activeSessions.get(userId);
    if (session) {
      this.activeSessions.delete(userId);
      return { ...session };
    }
    return undefined;
  }

  /**
   * Checks if a user has an active study session.
   *
   * @param userId The unique identifier of the user.
   * @returns True if a session is active, false otherwise.
   */
  public hasSession(userId: string): boolean {
    return this.activeSessions.has(userId);
  }

  /**
   * Retrieves all currently active study sessions.
   *
   * @returns A map copy containing the active study sessions.
   */
  public getAllSessions(): Map<string, StudySession> {
    const copy = new Map<string, StudySession>();
    for (const [key, value] of this.activeSessions.entries()) {
      copy.set(key, { ...value });
    }
    return copy;
  }

  /**
   * Gets the total number of active study sessions.
   *
   * @returns The number of active sessions.
   */
  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Clears all active study sessions. Used primarily for cleanup or resets.
   */
  public clearAllSessions(): void {
    this.activeSessions.clear();
  }
}

export = StudySessionManager;
