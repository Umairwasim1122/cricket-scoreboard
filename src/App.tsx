import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useCricketStore } from "@/store/cricketStore";
import { PwaUpdateBanner } from "@/components/PwaUpdateBanner";

// Pages
import Landing from "@/pages/Landing";

import { AdminLayout } from "@/layouts/AdminLayout";
import { DisplayLayout } from "@/layouts/DisplayLayout";

import Dashboard from "@/pages/admin/Dashboard";
import Tournaments from "@/pages/admin/Tournaments";
import Matches from "@/pages/admin/Matches";
import History from "@/pages/admin/History";

import MainScore from "@/pages/display/MainScore";
import TargetView from "@/pages/display/TargetView";
import ResultView from "@/pages/display/ResultView";
import InningsBreak from "@/pages/display/InningsBreak";

const queryClient = new QueryClient();

// Helper to switch display views dynamically based on admin state
function SmartDisplay() {
  const [view, setView] = useState<'score' | 'target' | 'result' | 'break'>('score');
  
  useEffect(() => {
    // Listen to local store or broadcast
    const checkView = () => {
      const store = useCricketStore.getState();
      const match = store.matches.find(m => m.id === store.activeMatchId);
      if (!match) return;
      if (match.publicView !== view) {
        setView(match.publicView);
      }
    };
    
    checkView();
    const unsub = useCricketStore.subscribe(checkView);
    return unsub;
  }, [view]);

  switch (view) {
    case 'score': return <MainScore />;
    case 'target': return <TargetView />;
    case 'result': return <ResultView />;
    case 'break': return <InningsBreak />;
    default: return <MainScore />;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <AdminLayout><Dashboard /></AdminLayout>
      </Route>
      <Route path="/admin/tournaments">
        <AdminLayout><Tournaments /></AdminLayout>
      </Route>
      <Route path="/admin/matches">
        <AdminLayout><Matches /></AdminLayout>
      </Route>
      <Route path="/admin/history">
        <AdminLayout><History /></AdminLayout>
      </Route>

      {/* Display Routes */}
      <Route path="/display">
        <DisplayLayout><SmartDisplay /></DisplayLayout>
      </Route>
      <Route path="/display/target">
        <DisplayLayout><TargetView /></DisplayLayout>
      </Route>
      <Route path="/display/result">
        <DisplayLayout><ResultView /></DisplayLayout>
      </Route>
      <Route path="/display/break">
        <DisplayLayout><InningsBreak /></DisplayLayout>
      </Route>

      <Route>
        <div className="flex h-screen items-center justify-center">404 Not Found</div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <PwaUpdateBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
