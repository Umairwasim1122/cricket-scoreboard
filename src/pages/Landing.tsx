import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground p-4">
      <h1 className="text-4xl font-display font-bold mb-8 text-primary">CRICKET SCOREBOARD</h1>
      <div className="flex flex-col sm:flex-row gap-6">
        <Link href="/admin">
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-card border border-border hover:border-primary transition-colors cursor-pointer w-64 h-48 text-center group">
            <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">Admin Panel</h2>
            <p className="text-muted-foreground">Control the scoreboard, manage matches</p>
          </div>
        </Link>
        <div 
          onClick={() => window.open(import.meta.env.BASE_URL + 'display', '_blank')}
          className="flex flex-col items-center justify-center p-8 rounded-xl bg-card border border-border hover:border-accent transition-colors cursor-pointer w-64 h-48 text-center group"
        >
          <h2 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Open Display</h2>
          <p className="text-muted-foreground">Launch stadium screen in new tab</p>
        </div>
      </div>
    </div>
  );
}
