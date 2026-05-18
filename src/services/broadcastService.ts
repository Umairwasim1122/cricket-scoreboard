import { Match } from "../types/cricket";

const CHANNEL_NAME = "cricket-scoreboard";

class BroadcastService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(state: any) => void> = new Set();

  init() {
    if (this.channel) return;
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      this.listeners.forEach(listener => listener(event.data));
    };
  }

  broadcast(state: any) {
    if (!this.channel) this.init();
    this.channel?.postMessage(state);
  }

  subscribe(listener: (state: any) => void) {
    if (!this.channel) this.init();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  cleanup() {
    this.listeners.clear();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const broadcastService = new BroadcastService();
