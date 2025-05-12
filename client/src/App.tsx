import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { SandboxProvider } from "./contexts/SandboxContext";
import Dashboard from "@/pages/dashboard";
import Reviews from "@/pages/reviews";
import Applications from "@/pages/applications";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import WebSocketDemo from "@/pages/websocket-demo";
import Sandbox from "@/pages/sandbox";
import Layout from "@/components/layout/Layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/applications" component={Applications} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/websocket-demo" component={WebSocketDemo} />
      <Route path="/sandbox" component={Sandbox} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WebSocketProvider>
            <Layout>
              <Router />
            </Layout>
            <Toaster />
          </WebSocketProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
