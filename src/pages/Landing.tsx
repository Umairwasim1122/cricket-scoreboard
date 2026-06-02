import { Link } from "wouter";

const getDisplayPopupFeatures = () => {
  const mobileView = localStorage.getItem('cricket-scoreboard-mobile-view') === 'true';
  return mobileView
    ? 'popup=yes,toolbar=0,location=0,menubar=0,status=0,resizable=1,scrollbars=1,width=420,height=780'
    : 'popup=yes,toolbar=0,location=0,menubar=0,status=0,resizable=1,scrollbars=1,width=1200,height=800';
};

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground p-4 sm:p-6">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-8 text-primary text-center">CRICKET SCOREBOARD</h1>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
        <Link href="/admin" className="flex-1">
          <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-card border border-border hover:border-primary transition-colors cursor-pointer min-h-[10rem] sm:min-h-[12rem] text-center group w-full">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-primary transition-colors">Admin Panel</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Control the scoreboard, manage matches</p>
          </div>
        </Link>
        <div
          onClick={() => {
            const url = import.meta.env.BASE_URL.replace(/\/$/, "") + '/display';
            const popup = window.open(url, 'cricket-display', getDisplayPopupFeatures());
            if (popup) popup.focus();
          }}
          className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-card border border-border hover:border-accent transition-colors cursor-pointer min-h-[10rem] sm:min-h-[12rem] text-center group flex-1"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Open Display</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Launch stadium screen in new window</p>
        </div>
      </div>
    </div>
  );
}
