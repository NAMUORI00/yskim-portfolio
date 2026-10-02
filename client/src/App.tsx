import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import CapabilitiesPreview from "./pages/CapabilitiesPreview";
import { CV, ProjectDetail, ResearchDetail } from "./pages/ContentPages";
import Home from "./pages/Home";

// 지식 그래프 시안 비교용 로컬 검토 라우트 — 이 주소를 열 때만 불러옵니다 (공개 홈 번들에 넣지 않음).
const KnowledgeGraphPreview = lazy(() => import("./pages/KnowledgeGraphPreview"));
// 3D 지식 그래프 시안 (기준: 지금 공개 중인 층위형 지도) — 마찬가지로 이 주소를 열 때만 불러옵니다.
const KnowledgeGraph3DPreview = lazy(() => import("./pages/KnowledgeGraph3DPreview"));

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/cv"} component={CV} />
      <Route path={"/projects/:slug"} component={ProjectDetail} />
      <Route path={"/research/:slug"} component={ResearchDetail} />
      <Route path={"/design/capabilities"} component={CapabilitiesPreview} />
      <Route path={"/design/knowledge-graph-3d"}>
        <Suspense fallback={null}>
          <KnowledgeGraph3DPreview />
        </Suspense>
      </Route>
      <Route path={"/design/knowledge-graph"}>
        <Suspense fallback={null}>
          <KnowledgeGraphPreview />
        </Suspense>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
