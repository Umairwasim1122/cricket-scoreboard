import { ReactNode } from "react";
import { ScoreAnimation } from "../animations/ScoreAnimation";

export function DisplayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen h-dvh w-screen bg-background text-foreground overflow-hidden relative font-display">
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
      <ScoreAnimation />
    </div>
  );
}
