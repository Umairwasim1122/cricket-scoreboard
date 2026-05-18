import { AnimatePresence, motion } from "framer-motion";
import { useCricketStore } from "../store/cricketStore";
import { useEffect } from "react";

export function ScoreAnimation() {
  const lastEvent = useCricketStore(state => state.lastEvent);
  const setLastEvent = useCricketStore(state => state.setLastEvent);

  useEffect(() => {
    if (!lastEvent) return;
    const timer = setTimeout(() => {
      setLastEvent(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [lastEvent, setLastEvent]);

  return (
    <AnimatePresence>
      {lastEvent === 'four' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-primary/20 backdrop-blur-sm"
        >
          <h1 className="text-[15rem] font-bold text-primary drop-shadow-[0_0_50px_rgba(0,170,255,1)] italic">
            FOUR!
          </h1>
        </motion.div>
      )}
      
      {lastEvent === 'six' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.2, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-accent/20 backdrop-blur-sm"
        >
          <h1 className="text-[20rem] font-bold text-accent drop-shadow-[0_0_80px_rgba(255,215,0,1)] tracking-widest uppercase">
            SIX!
          </h1>
        </motion.div>
      )}

      {lastEvent === 'wide' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 80 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-sky-900/30 backdrop-blur-sm"
        >
          <h1 className="text-[12rem] font-bold text-sky-300 drop-shadow-[0_0_40px_rgba(56,189,248,0.8)] uppercase tracking-widest">
            WIDE!
          </h1>
        </motion.div>
      )}

      {lastEvent === 'noBall' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 80 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-orange-900/30 backdrop-blur-sm"
        >
          <h1 className="text-[12rem] font-bold text-orange-200 drop-shadow-[0_0_40px_rgba(251,146,60,0.8)] uppercase tracking-widest">
            NO BALL!
          </h1>
        </motion.div>
      )}

      {lastEvent === 'wicket' && (
        <motion.div
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-destructive/40 backdrop-blur-md"
        >
          <motion.h1 
            animate={{ x: [-10, 10, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
            className="text-[18rem] font-bold text-destructive drop-shadow-[0_0_100px_rgba(239,68,68,1)] uppercase"
          >
            WICKET!
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
