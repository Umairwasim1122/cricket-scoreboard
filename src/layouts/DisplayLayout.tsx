import { ReactNode } from "react";
import { ScoreAnimation } from "../animations/ScoreAnimation";

export function DisplayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-hidden relative font-display flex flex-col items-center justify-center">
      {children}
      <ScoreAnimation />
    </div>
  );
}
