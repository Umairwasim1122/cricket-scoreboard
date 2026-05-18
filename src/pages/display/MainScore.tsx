import { useEffect } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion } from "framer-motion";

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
    </div>
  );
}
