import { useEffect, useState } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion } from "framer-motion";
import { Match } from "@/types/cricket";

function TimerDisplay({ match }: { match: Match | undefined }) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerColor, setTimerColor] = useState("text-foreground");

  useEffect(() => {
    if (!match?.inningsTimerMinutes || !match?.timerStartedAt) return;
    if (match.status === "completed") return;

    const interval = setInterval(() => {
      const totalMs = match.inningsTimerMinutes! * 60 * 1000;
      const startTime = new Date(match.timerStartedAt!).getTime();
      let elapsedMs = 0;

      if (match.status === "live") {
        const pausedTime = match.timerPausedTime ?? 0;
        elapsedMs = Date.now() - startTime + pausedTime;
      } else if (match.status === "paused") {
        elapsedMs = match.timerPausedTime ?? 0;
      }

      const remaining = totalMs - elapsedMs;
      const remainingSeconds = Math.floor(remaining / 1000);
      const minAllowed = -10 * 60; // -10 minutes in seconds
      const cappedSeconds = Math.max(minAllowed, remainingSeconds);
      
      setTimeRemaining(cappedSeconds);

      // Determine color
      const percent = (elapsedMs / totalMs) * 100;
      if (cappedSeconds <= 0) {
        setTimerColor("text-red-500");
      } else if (cappedSeconds <= 20) {
        setTimerColor("text-red-500");
      } else if (percent >= 80) {
        setTimerColor("text-yellow-500");
      } else {
        setTimerColor("text-foreground");
      }
    }, 100);

    return () => clearInterval(interval);
  }, [match]);

  if (timeRemaining === null) return null;

  const isNegative = timeRemaining < 0;
  const absTime = Math.abs(timeRemaining);
  const minutes = Math.floor(absTime / 60);
  const seconds = absTime % 60;

  return (
    <div className={`absolute bottom-8 right-8 text-center ${timerColor} transition-colors duration-300`}>
      <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-2">Innings Timer</div>
      <div className="text-5xl font-bold tabular-nums">
        {isNegative ? "-" : ""}{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
}

export default function MainScore() {
  const { matches, activeMatchId, syncState } = useCricketStore();
  const match = matches.find(m => m.id === activeMatchId);

  useEffect(() => {
    const unsubscribe = broadcastService.subscribe((incoming) => {
      const cur = useCricketStore.getState();
      const isSame = (() => {
        if (!incoming) return true;
        if (incoming.activeMatchId !== cur.activeMatchId) return false;
        if (incoming.lastEvent !== undefined && incoming.lastEvent !== cur.lastEvent) return false;
        if (incoming.breakMessage !== undefined && incoming.breakMessage !== cur.breakMessage) return false;
        
        if (incoming.matches && JSON.stringify(incoming.matches) !== JSON.stringify(cur.matches)) return false;
        return true;
      })();
      if (!isSame) syncState(incoming);
    });
    return () => unsubscribe();
  }, [syncState]);

  if (!match) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-4xl text-muted-foreground animate-pulse">Waiting for match data...</div>
      </div>
    );
  }

  const innings = match.innings[match.currentInnings];
  const validBalls = innings.balls.filter(b => b.extra !== 'wide' && b.extra !== 'noBall');
  const ballsThisOver = validBalls.length % 6;
  const oversText = `${innings.overs}.${ballsThisOver}`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0a0a1a]">
      <div className="absolute top-8 left-6 text-primary font-bold text-2xl sm:text-4xl tracking-widest uppercase opacity-80">
        {match.tournamentId ? useCricketStore.getState().tournaments.find(t => t.id === match.tournamentId)?.name ?? "CRICKET MATCH" : "CRICKET MATCH"}
      </div>
      <div className="absolute top-8 right-6 text-muted-foreground font-bold text-xl sm:text-3xl">
        {match.teamA} VS {match.teamB}
      </div>

      <motion.div
        key={innings.totalRuns + '-' + innings.wickets}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="flex flex-col items-center justify-center"
      >
        <h2 className="text-4xl sm:text-6xl text-primary font-bold tracking-widest uppercase mb-4">
          {innings.battingTeam}
        </h2>
        <div className="text-[7rem] sm:text-[10rem] md:text-[14rem] lg:text-[18rem] xl:text-[20rem] font-bold leading-none tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          {innings.totalRuns}
          <span className="text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] xl:text-[12rem] text-muted-foreground">/{innings.wickets}</span>
        </div>
        <div className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-accent tracking-wider bg-black/40 px-6 sm:px-12 py-3 sm:py-4 rounded-3xl border border-accent/20 backdrop-blur-md">
          {oversText} <span className="text-2xl sm:text-3xl md:text-4xl text-muted-foreground">/ {match.totalOvers} OVERS</span>
        </div>
      </motion.div>
      <TimerDisplay match={match} />
    </div>
  );
}
