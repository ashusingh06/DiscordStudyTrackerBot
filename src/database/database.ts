import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

export interface CompletedSession {
  id?: number;
  userId: string;
  username: string;
  channelId?: string;
  channelName?: string;
  joinedAt: string;
  endedAt: string;
  duration: number;
}

const dbPath = path.join(process.cwd(), "study.db");
const db = new sqlite3.Database(dbPath);

function runAsync(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function allAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

function getAsync<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

/**
 * Initializes the SQLite database tables and triggers JSON migration if needed.
 */
export async function initDatabase(): Promise<void> {
  try {
    await runAsync(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        channel_id TEXT,
        channel_name TEXT,
        joined_at TEXT,
        ended_at TEXT,
        duration INTEGER
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS user_goals (
        user_id TEXT PRIMARY KEY,
        goal_hours INTEGER
      )
    `);

    await migrateJsonDataIfNeeded();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

/**
 * Saves a completed study session to SQLite.
 */
export async function saveStudySession(session: {
  userId: string;
  username: string;
  channelId?: string;
  channelName?: string;
  joinedAt: string;
  endedAt: string;
  duration: number;
}): Promise<void> {
  try {
    await runAsync(
      `INSERT INTO study_sessions (user_id, username, channel_id, channel_name, joined_at, ended_at, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.userId,
        session.username,
        session.channelId ?? null,
        session.channelName ?? null,
        session.joinedAt,
        session.endedAt,
        session.duration,
      ]
    );
  } catch (error) {
    console.error("Error saving study session to database:", error);
  }
}

/**
 * Retrieves all study sessions for a specific user.
 */
export async function getUserSessions(userId: string): Promise<CompletedSession[]> {
  try {
    const rows = await allAsync<{
      id: number;
      user_id: string;
      username: string;
      channel_id: string | null;
      channel_name: string | null;
      joined_at: string;
      ended_at: string;
      duration: number;
    }>(
      `SELECT * FROM study_sessions WHERE user_id = ? ORDER BY joined_at ASC`,
      [userId]
    );

    return rows.map((row) => {
      const session: CompletedSession = {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        joinedAt: row.joined_at,
        endedAt: row.ended_at,
        duration: row.duration,
      };
      if (row.channel_id) session.channelId = row.channel_id;
      if (row.channel_name) session.channelName = row.channel_name;
      return session;
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
}

/**
 * Retrieves all study sessions for all users.
 */
export async function getAllSessions(): Promise<CompletedSession[]> {
  try {
    const rows = await allAsync<{
      id: number;
      user_id: string;
      username: string;
      channel_id: string | null;
      channel_name: string | null;
      joined_at: string;
      ended_at: string;
      duration: number;
    }>(`SELECT * FROM study_sessions ORDER BY joined_at ASC`);

    return rows.map((row) => {
      const session: CompletedSession = {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        joinedAt: row.joined_at,
        endedAt: row.ended_at,
        duration: row.duration,
      };
      if (row.channel_id) session.channelId = row.channel_id;
      if (row.channel_name) session.channelName = row.channel_name;
      return session;
    });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    return [];
  }
}

/**
 * Sets or updates a daily study goal for a user.
 */
export async function setUserGoal(userId: string, goalHours: number): Promise<void> {
  try {
    await runAsync(
      `INSERT INTO user_goals (user_id, goal_hours)
       VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET goal_hours = excluded.goal_hours`,
      [userId, goalHours]
    );
  } catch (error) {
    console.error("Error setting user goal:", error);
  }
}

/**
 * Retrieves a user's daily study goal in hours. Returns null if not set.
 */
export async function getUserGoal(userId: string): Promise<number | null> {
  try {
    const row = await getAsync<{ user_id: string; goal_hours: number }>(
      `SELECT goal_hours FROM user_goals WHERE user_id = ?`,
      [userId]
    );
    return row ? row.goal_hours : null;
  } catch (error) {
    console.error("Error getting user goal:", error);
    return null;
  }
}

/**
 * Automatically migrates existing JSON files into SQLite database on first startup.
 */
async function migrateJsonDataIfNeeded(): Promise<void> {
  const studyJsonPath = path.join(process.cwd(), "study-data.json");
  const goalJsonPath = path.join(process.cwd(), "goal-data.json");

  // Migrate study-data.json
  if (fs.existsSync(studyJsonPath)) {
    try {
      console.log("🔄 Migrating study-data.json to SQLite database...");
      const fileContent = fs.readFileSync(studyJsonPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      const sessionsToInsert: CompletedSession[] = [];

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item === "object" &&
            typeof item.userId === "string" &&
            typeof item.duration === "number"
          ) {
            const s: CompletedSession = {
              userId: item.userId,
              username: typeof item.username === "string" ? item.username : "Unknown User",
              joinedAt: typeof item.joinedAt === "string" ? item.joinedAt : new Date().toISOString(),
              endedAt: typeof item.endedAt === "string" ? item.endedAt : new Date().toISOString(),
              duration: item.duration,
            };
            if (typeof item.channelId === "string") s.channelId = item.channelId;
            if (typeof item.channelName === "string") s.channelName = item.channelName;
            sessionsToInsert.push(s);
          }
        }
      } else if (parsed && typeof parsed === "object") {
        for (const [userId, entry] of Object.entries(parsed)) {
          if (!entry) continue;

          if (Array.isArray(entry)) {
            for (const item of entry) {
              if (item && typeof item === "object" && typeof item.duration === "number") {
                const s: CompletedSession = {
                  userId: userId,
                  username: typeof item.username === "string" ? item.username : "Unknown User",
                  joinedAt: typeof item.joinedAt === "string" ? item.joinedAt : new Date().toISOString(),
                  endedAt: typeof item.endedAt === "string" ? item.endedAt : new Date().toISOString(),
                  duration: item.duration,
                };
                if (typeof item.channelId === "string") s.channelId = item.channelId;
                if (typeof item.channelName === "string") s.channelName = item.channelName;
                sessionsToInsert.push(s);
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
                  const s: CompletedSession = {
                    userId: userId,
                    username: typeof itemObj.username === "string" ? itemObj.username : username,
                    joinedAt: typeof itemObj.joinedAt === "string" ? itemObj.joinedAt : new Date().toISOString(),
                    endedAt: typeof itemObj.endedAt === "string" ? itemObj.endedAt : new Date().toISOString(),
                    duration: item.duration,
                  };
                  if (typeof itemObj.channelId === "string") s.channelId = itemObj.channelId;
                  if (typeof itemObj.channelName === "string") s.channelName = itemObj.channelName;
                  sessionsToInsert.push(s);
                }
              }
            }
          }
        }
      }

      for (const s of sessionsToInsert) {
        await saveStudySession(s);
      }

      fs.renameSync(studyJsonPath, `${studyJsonPath}.bak`);
      console.log("✅ study-data.json successfully migrated and renamed to study-data.json.bak");
    } catch (error) {
      console.error("Error migrating study-data.json:", error);
    }
  }

  // Migrate goal-data.json
  if (fs.existsSync(goalJsonPath)) {
    try {
      console.log("🔄 Migrating goal-data.json to SQLite database...");
      const fileContent = fs.readFileSync(goalJsonPath, "utf-8");
      const parsed = JSON.parse(fileContent);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [userId, entry] of Object.entries(parsed)) {
          if (
            entry &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).goalHours === "number"
          ) {
            await setUserGoal(userId, (entry as Record<string, unknown>).goalHours as number);
          }
        }
      }

      fs.renameSync(goalJsonPath, `${goalJsonPath}.bak`);
      console.log("✅ goal-data.json successfully migrated and renamed to goal-data.json.bak");
    } catch (error) {
      console.error("Error migrating goal-data.json:", error);
    }
  }
}
