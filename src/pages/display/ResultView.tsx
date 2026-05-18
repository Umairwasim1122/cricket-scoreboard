import { useEffect } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

export default function ResultView() {
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
        <div className="text-4xl text-muted-foreground animate-pulse">No match data.</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0a0a1a]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center flex flex-col items-center"
      >
        <Trophy className="w-28 h-28 sm:w-48 sm:h-48 text-accent mb-6 sm:mb-8 drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]" />

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-success font-bold tracking-widest uppercase mb-8 sm:mb-12 drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">
          {match.result || "MATCH COMPLETED"}
        </h1>

        <div className="flex flex-col gap-8 sm:gap-24 sm:flex-row items-center justify-center bg-card/50 p-6 sm:p-12 rounded-[2rem] border border-border backdrop-blur-sm w-full max-w-5xl">
          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl text-muted-foreground font-bold mb-4">{match.teamA}</h3>
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
              {match.innings[0].totalRuns}/{match.innings[0].wickets}
            </div>
          </div>

          <div className="text-3xl sm:text-4xl text-muted-foreground font-bold italic">VS</div>

          <div className="text-center">
            <h3 className="text-2xl sm:text-3xl text-muted-foreground font-bold mb-4">{match.teamB}</h3>
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
              {match.innings[1]?.totalRuns ?? 0}/{match.innings[1]?.wickets ?? 0}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
