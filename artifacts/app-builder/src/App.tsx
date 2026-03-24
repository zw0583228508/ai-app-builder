import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import ErrorBoundary from "@/components/ErrorBoundary";

// Pages
import Home from "@/pages/Home";
import ProjectView from "@/pages/ProjectView";
import Integrations from "@/pages/Integrations";
import ShareView from "@/pages/ShareView";
import Analytics from "@/pages/Analytics";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { Gallery } from "@/pages/Gallery";
import Memory from "@/pages/Memory";
import Status from "@/pages/Status";
import Pricing from "@/pages/Pricing";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/project/:id" component={ProjectView} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/login" component={Login} />
      <Route path="/s/:token" component={ShareView} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/memory" component={Memory} />
      <Route path="/status" component={Status} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
