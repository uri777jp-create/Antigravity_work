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
import { Loader2, ArrowLeft, Sparkles, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Admin専用クエリ作成ページ
 * - 全NeuronWriterプロジェクトから選択可能
 * - 言語・検索エンジン設定を表示
 * - 詳細なAPI応答を確認可能
 */
export default function AdminNewQuery() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();

    // 管理者権限チェック
    if (user && user.role !== "admin") {
        setLocation("/dashboard");
        return null;
    }

    const [keyword, setKeyword] = useState("");
    const [language, setLanguage] = useState("Japanese");
    const [searchEngine, setSearchEngine] = useState("google.co.jp");
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedNeuronProjectId, setSelectedNeuronProjectId] = useState("");

    // Loading state
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

    const { data: projects, refetch: refetchProjects } = trpc.neuronwriter.getUserProjects.useQuery(undefined, {
        enabled: !!user,
    });

    // Admin用: 全NeuronWriterプロジェクト一覧
    const { data: neuronProjects } = trpc.neuronwriter.listProjects.useQuery();

    // Polling for completion
    const { data: pollingData } = trpc.neuronwriter.getQueryRecommendations.useQuery(
        { queryId: createdQueryId! },
        {
            enabled: !!createdQueryId && isGenerating,
            refetchInterval: 3000,
        }
    );

    // Monitor polling result
    useEffect(() => {
        if (pollingData?.status === "ready" && createdQueryId) {
            setLoadingProgress(100);
            setCurrentStep(steps.length - 1);

            setTimeout(() => {
                toast.success("AI分析が完了しました！");
                // Admin用詳細ページへ遷移
                setLocation(`/admin/queries/${createdQueryId}`);
            }, 800);
        }
    }, [pollingData, createdQueryId, setLocation, steps.length]);

    const createQueryMutation = trpc.neuronwriter.createQuery.useMutation({
        onSuccess: (data) => {
            setCreatedQueryId(data.queryId);
        },
        onError: (error) => {
            toast.error(`クエリの作成に失敗しました： ${error.message}`);
            setLoadingProgress(0);
            setCurrentStep(0);
            setIsGenerating(false);
            setCreatedQueryId(null);
        },
    });

    // Progress animation
    useEffect(() => {
        if (isGenerating) {
            setLoadingProgress(0);
            setCurrentStep(0);

            const totalDuration = 60000;
            const intervalTime = 100;
            const stepsCount = steps.length;
            const stepDuration = totalDuration / stepsCount;

            let elapsed = 0;

            const timer = setInterval(() => {
                elapsed += intervalTime;
                const progress = Math.min((elapsed / totalDuration) * 100, 95);
                setLoadingProgress(prev => (prev === 100 ? 100 : progress));

                const stepIndex = Math.min(Math.floor(elapsed / stepDuration), stepsCount - 1);
                setCurrentStep(stepIndex);

                if (elapsed >= totalDuration) {
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
            toast.error("プロジェクトを選択してください");
            return;
        }

        setIsGenerating(true);
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
                            if (data && data.projectId) {
                                setSelectedProjectId(data.projectId);
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
                                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" style={{ animationDuration: '2s' }}></div>
                                <div className="text-3xl font-bold text-primary">{Math.round(loadingProgress)}%</div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold animate-pulse text-gray-800">{steps[currentStep].label}</h3>
                                <p className="text-muted-foreground text-sm">AIが最適な記事構成を生成しています。</p>
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
                <Link href="/admin">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        管理者ダッシュボードに戻る
                    </Button>
                </Link>

                <Card className="max-w-2xl mx-auto border-primary/20 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-3xl">
                            <Settings className="w-7 h-7 text-primary" />
                            管理者: クエリ作成
                        </CardTitle>
                        <CardDescription className="text-base">
                            全プロジェクトから選択可能 / 詳細設定付き
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* プロジェクト選択（Admin用: 全プロジェクト表示） */}
                            <div className="space-y-2">
                                <Label>NeuronWriterプロジェクト</Label>
                                <Select onValueChange={handleProjectSelect} value={selectedNeuronProjectId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="プロジェクトを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {neuronProjects?.projects?.map((project: any) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name || project.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* キーワード入力 */}
                            <div className="space-y-2">
                                <Label htmlFor="keyword">ターゲットキーワード</Label>
                                <Input
                                    id="keyword"
                                    placeholder="例: クレジットカード おすすめ"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    className="text-lg h-12"
                                />
                            </div>

                            {/* 言語設定 */}
                            <div className="space-y-2">
                                <Label>言語</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Japanese">日本語</SelectItem>
                                        <SelectItem value="English">英語</SelectItem>
                                        <SelectItem value="Chinese">中国語</SelectItem>
                                        <SelectItem value="Korean">韓国語</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 検索エンジン設定 */}
                            <div className="space-y-2">
                                <Label>検索エンジン</Label>
                                <Select value={searchEngine} onValueChange={setSearchEngine}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="google.co.jp">Google日本</SelectItem>
                                        <SelectItem value="google.com">Google US</SelectItem>
                                        <SelectItem value="google.co.uk">Google UK</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
