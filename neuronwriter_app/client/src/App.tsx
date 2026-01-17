import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NewQuery from "./pages/NewQuery";
import QueriesList from "./pages/QueriesList";
import QueryDetail from "./pages/QueryDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminNewQuery from "./pages/AdminNewQuery";
import AdminQueriesList from "./pages/AdminQueriesList";
import Login from "./pages/Login";
import BillingPage from "./pages/BillingPage";
import BillingSuccessPage from "./pages/BillingSuccessPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"} component={Dashboard} />
      {/* Admin専用ルート */}
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path="/admin/new-query" component={AdminNewQuery} />
      <Route path="/admin/queries" component={AdminQueriesList} />
      <Route path="/admin/queries/:id" component={QueryDetail} />
      {/* User用ルート */}
      <Route path="/new-query" component={NewQuery} />
      <Route path="/queries" component={QueriesList} />
      <Route path="/query/:id" component={QueryDetail} />
      {/* 課金関連ページ */}
      <Route path="/billing" component={BillingPage} />
      <Route path="/billing/success" component={BillingSuccessPage} />
      <Route path="/billing/cancel" component={BillingPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
