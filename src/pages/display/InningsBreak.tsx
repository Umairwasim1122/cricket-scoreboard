import { useEffect } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { broadcastService } from "@/services/broadcastService";
import { motion, AnimatePresence } from "framer-motion";

export default function InningsBreak() {
  const { matches, activeMatchId, breakMessage, syncState } = useCricketStore();
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

  if (!match) return null;

  const innings1 = match.innings[0];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0a0a1a] relative">
      {!breakMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <h1 className="text-[5rem] sm:text-[7rem] md:text-[8rem] lg:text-[10rem] text-warning font-bold tracking-widest uppercase mb-10 sm:mb-12 drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            INNINGS BREAK
          </h1>

          <div className="bg-card/40 p-6 sm:p-12 rounded-[2rem] border border-border backdrop-blur-sm inline-block max-w-full">
            <h3 className="text-3xl sm:text-5xl text-muted-foreground font-bold mb-4 sm:mb-6 uppercase tracking-wider">
              {innings1.battingTeam} SCORED
            </h3>
            <div className="text-[5rem] sm:text-[7rem] md:text-[8rem] lg:text-[9rem] font-bold text-white">
              {innings1.totalRuns} <span className="text-[3rem] sm:text-[5rem] md:text-[6rem] text-muted-foreground">runs</span>
            </div>
            <div className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl text-primary font-bold">
              Target for {match.teamB}:{" "}
              <span className="text-white text-4xl sm:text-5xl md:text-6xl">{innings1.totalRuns + 1}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Admin message overlay at the bottom */}
      <AnimatePresence>
        {breakMessage && (
          <motion.div
            key={breakMessage}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-0 right-0 bg-primary/90 backdrop-blur-md px-16 py-8 text-center border-t border-primary/50"
          >
            <p className="text-white text-6xl font-bold tracking-wide leading-tight">
              {breakMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
