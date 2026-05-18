import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Match, MatchHistory, Tournament } from '../types/cricket';

interface CricketDB extends DBSchema {
  tournaments: {
    key: string;
    value: Tournament;
  };
  matches: {
    key: string;
    value: Match;
  };
  matchHistory: {
    key: string;
    value: MatchHistory;
  };
}

let dbPromise: Promise<IDBPDatabase<CricketDB>> | null = null;

const initDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<CricketDB>('cricket-scoreboard-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tournaments')) {
          db.createObjectStore('tournaments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('matches')) {
          db.createObjectStore('matches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('matchHistory')) {
          db.createObjectStore('matchHistory', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const dbHelpers = {
  async saveMatch(match: Match) {
    const db = await initDB();
    await db.put('matches', match);
  },
  async getMatch(id: string) {
    const db = await initDB();
    return db.get('matches', id);
  },
  async getAllMatches() {
    const db = await initDB();
    return db.getAll('matches');
  },
  async saveTournament(tournament: Tournament) {
    const db = await initDB();
    await db.put('tournaments', tournament);
  },
  async getAllTournaments() {
    const db = await initDB();
    return db.getAll('tournaments');
  },
  async saveMatchHistory(history: MatchHistory) {
    const db = await initDB();
    await db.put('matchHistory', history);
  },
  async getAllMatchHistory() {
    const db = await initDB();
    return db.getAll('matchHistory');
  }
};
