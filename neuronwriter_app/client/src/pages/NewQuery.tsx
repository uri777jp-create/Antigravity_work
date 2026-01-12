import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function NewQuery() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("Japanese");
  const [searchEngine, setSearchEngine] = useState("google.co.jp");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedNeuronProjectId, setSelectedNeuronProjectId] = useState("");

  // Loading state management
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdQueryId, setCreatedQueryId] = useState<number | null>(null);

  const steps = [
    { label: "Google検索上位サイトをクロール中...", icon: <Sparkles className="w-6 h-6 animate-pulse text-blue-500" /> },
    { label: "検索意図とユーザーニーズを特定中...", icon: <Sparkles className="w-6 h-6 animate-pulse text-purple-500" /> },
    { label: "NLPエンティティ・共起語を抽出中...", icon: <Sparkles className="w-6 h-6 animate-pulse text-orange-500" /> },
    { label: "構成案を最終最適化中...", icon: <Sparkles className="w-6 h-6 animate-pulse text-green-500" /> },
  ];

  /* eslint-disable react-hooks/exhaustive-deps */
  const { data: projects, refetch: refetchProjects } = trpc.neuronwriter.getUserProjects.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: neuronProjects } = trpc.neuronwriter.listProjects.useQuery();

  // Polling for completion
  const { data: pollingData } = trpc.neuronwriter.getQueryRecommendations.useQuery(
    { queryId: createdQueryId! },
    {
      enabled: !!createdQueryId && isGenerating,
      refetchInterval: 3000, // Poll every 3s
    }
  );

  // Monitor polling result
  useEffect(() => {
    if (pollingData?.status === "ready" && createdQueryId) {
      // Analysis complete!
      setLoadingProgress(100);
      setCurrentStep(steps.length - 1);

      setTimeout(() => {
        toast.success("AI分析が完了しました！");
        // Redirect to editor tab by default
        setLocation(`/query/${createdQueryId}?tab=editor`);
        // setIsGenerating(false); // No need to set false as we navigate away
      }, 800);
    }
  }, [pollingData, createdQueryId, setLocation, steps.length]);


  // Auto-select user's assigned project
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  if (projects?.length && !selectedNeuronProjectId && !hasAutoSelected) {
    // Prefer the user's assigned project
    const userProject = projects[0];
    // We defer this call to avoid side-effects during render
    setTimeout(() => handleProjectSelect(userProject.neuronProjectId), 0);
    setHasAutoSelected(true);
  } else if (neuronProjects?.projects?.length && !selectedNeuronProjectId && !hasAutoSelected && !projects?.length) {
    // Fallback only if user has no project (shouldn't happen for valid users)
    const firstId = neuronProjects.projects[0].id;
    setTimeout(() => handleProjectSelect(firstId), 0);
    setHasAutoSelected(true);
  }

  const createQueryMutation = trpc.neuronwriter.createQuery.useMutation({
    onSuccess: (data) => {
      // Just start polling, don't navigate yet
      setCreatedQueryId(data.queryId);
      // Progress keeps running via isGenerating
    },
    onError: (error) => {
      toast.error(`クエリの作成に失敗しました： ${error.message}`);
      setLoadingProgress(0);
      setCurrentStep(0);
      setIsGenerating(false);
      setCreatedQueryId(null);
    },
  });

  // Simulated progress effect
  useEffect(() => {
    if (isGenerating) {
      setLoadingProgress(0);
      setCurrentStep(0);

      const totalDuration = 60000; // 60s total
      const intervalTime = 100;
      const stepsCount = steps.length;
      const stepDuration = totalDuration / stepsCount;

      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += intervalTime;
        // Cap at 95% until polling confirms ready
        const progress = Math.min((elapsed / totalDuration) * 100, 95);

        // If polling finishes early (e.g. at 30s), jump to 100 is handled in polling effect
        // We only update if we are NOT yet at 100 (managed by other effect)
        setLoadingProgress(prev => (prev === 100 ? 100 : progress));

        const stepIndex = Math.min(Math.floor(elapsed / stepDuration), stepsCount - 1);
        setCurrentStep(stepIndex);

        if (elapsed >= totalDuration) {
          // Determine what to do after 60s if still not ready?
          // Just keep waiting at 95%
          clearInterval(timer);
        }
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [isGenerating, steps.length]);


  const syncProjectMutation = trpc.neuronwriter.syncProject.useMutation({
    onSuccess: () => {
      toast.success("プロジェクトを同期しました！");
      refetchProjects();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      toast.error("キーワードを入力してください");
      return;
    }

    if (!selectedProjectId || !selectedNeuronProjectId) {
      // Try to re-sync/select if visually selected but state missing
      if (selectedNeuronProjectId) {
        handleProjectSelect(selectedNeuronProjectId);
        // Wait a bit? No, this is async. 
        toast.error("プロジェクト情報を同期中...もう一度押してください");
        return;
      }
      toast.error("プロジェクトを選択してください");
      return;
    }

    setIsGenerating(true); // Start loading UI
    createQueryMutation.mutate({
      projectId: selectedProjectId,
      neuronProjectId: selectedNeuronProjectId,
      keyword: keyword.trim(),
      language,
      searchEngine,
    });
  };

  const handleProjectSelect = (value: string) => {
    const project = neuronProjects?.projects?.find((p: any) => p.id === value);
    if (project) {
      setSelectedNeuronProjectId(value);

      const existingProject = projects?.find((p) => p.neuronProjectId === value);
      if (existingProject) {
        setSelectedProjectId(existingProject.id);
      } else {
        syncProjectMutation.mutate(
          {
            neuronProjectId: value,
            name: project.name || value,
          },
          {
            onSuccess: (data: any) => {
              // Use the returned projectId directly
              if (data && data.projectId) {
                setSelectedProjectId(data.projectId);
              } else {
                // Fallback (should not happen with updated backend)
                refetchProjects().then((res) => {
                  const newProject = res.data?.find((p) => p.neuronProjectId === value);
                  if (newProject) setSelectedProjectId(newProject.id);
                });
              }
            },
          }
        );
      }
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="container max-w-lg p-6">
          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur">
            <CardContent className="pt-10 pb-10 text-center space-y-8">
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div
                  className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: '2s' }}
                ></div>
                <div className="text-3xl font-bold text-primary">
                  {Math.round(loadingProgress)}%
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold animate-pulse text-gray-800">
                  {steps[currentStep].label}
                </h3>
                <p className="text-muted-foreground text-sm">
                  AIが最適な記事構成を生成しています。画面を閉じずにお待ちください。
                </p>
              </div>

              <div className="space-y-4 pt-4 text-left px-4">
                {steps.map((step, idx) => (
                  <div key={idx} className={`flex items-center gap-3 transition-colors duration-500 ${idx === currentStep ? "opacity-100 scale-105 font-medium text-gray-900"
                    : idx < currentStep ? "opacity-50 text-gray-400"
                      : "opacity-30 text-gray-300"
                    }`}>
                    <div className={`p-1.5 rounded-full ${idx < currentStep ? "bg-green-100 text-green-600"
                      : idx === currentStep ? "bg-primary/10 text-primary"
                        : "bg-gray-100"
                      }`}>
                      {idx < currentStep ? (
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                      ) : (
                        <div className={`w-4 h-4 rounded-full ${idx === currentStep ? "bg-primary animate-ping" : "bg-gray-300"}`} />
                      )}
                    </div>
                    <span className="text-sm">{step.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ダッシュボードに戻る
          </Button>
        </Link>

        <Card className="max-w-2xl mx-auto border-primary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Sparkles className="w-7 h-7 text-primary" />
              新しい記事を作る
            </CardTitle>
            <CardDescription className="text-base">
              キーワードを入力してSEOコンテンツ推薦を生成
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>ワークスペース</Label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium">
                  {selectedNeuronProjectId ? (
                    neuronProjects?.projects?.find((p: any) => p.id === selectedNeuronProjectId)?.name || selectedNeuronProjectId
                  ) : (
                    <span className="text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyword">ターゲットキーワード</Label>
                <div className="text-sm text-muted-foreground mb-4 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p>
                    このツールは、Google検索の上位記事を分析して構成案を作成します。
                    <br />
                    そのため、<strong>既に一定の検索需要（ボリューム）があるキーワード</strong>を入力してください。
                  </p>
                  <div className="flex items-start gap-2 text-primary/80 font-medium pt-1">
                    <span className="bg-primary/10 px-2 py-0.5 rounded text-xs border border-primary/20 whitespace-nowrap">入力のヒント</span>
                    <span className="text-xs leading-relaxed">
                      複合キーワード（2語以上）で分析する場合は
                      <br />
                      <strong>「キーワードA[半角スペース]キーワードB」</strong> のように、間にスペースを入れて入力してください。
                      <br />
                      <span className="text-muted-foreground font-normal">例：「クレジットカード おすすめ」「ダイエット 食事」</span>
                    </span>
                  </div>
                </div>
                <Input
                  id="keyword"
                  placeholder="例: クレジットカード おすすめ（半角スペース区切り）"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              {/* Language and Search Engine settings hidden for white-labeling
               * Defaults: Japanese / google.co.jp
               */}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={createQueryMutation.isPending}
              >
                {createQueryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    クエリ作成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    クエリ作成
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
