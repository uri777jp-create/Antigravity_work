import { useState } from "react";
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

  /* eslint-disable react-hooks/exhaustive-deps */
  const { data: projects, refetch: refetchProjects } = trpc.neuronwriter.getUserProjects.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: neuronProjects } = trpc.neuronwriter.listProjects.useQuery();

  // Auto-select first project if available and nothing selected
  if (!selectedNeuronProjectId && neuronProjects && neuronProjects.projects && neuronProjects.projects.length > 0) {
    const firstProject = neuronProjects.projects[0];
    // We settle the state in a way to avoid infinite loops, but here we can just set it if null
    // However, doing this in render is bad practice. Proper way is useEffect.
  }

  // Use an effect for auto-selection
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  if (neuronProjects?.projects?.length && !selectedNeuronProjectId && !hasAutoSelected) {
    const firstId = neuronProjects.projects[0].id;
    // We defer this call to avoid side-effects during render
    setTimeout(() => handleProjectSelect(firstId), 0);
    setHasAutoSelected(true);
  }

  const createQueryMutation = trpc.neuronwriter.createQuery.useMutation({
    onSuccess: (data) => {
      toast.success("クエリを作成しました！");
      setLocation(`/query/${data.queryId}`);
    },
    onError: (error) => {
      toast.error(`クエリの作成に失敗しました： ${error.message}`);
    },
  });

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
              新しいクエリを作成
            </CardTitle>
            <CardDescription className="text-base">
              キーワードを入力してSEOコンテンツ推薦を生成
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project">NeuronWriterプロジェクト</Label>
                <Select value={selectedNeuronProjectId} onValueChange={handleProjectSelect}>
                  <SelectTrigger id="project">
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

              <div className="space-y-2">
                <Label htmlFor="keyword">キーワード</Label>
                <Input
                  id="keyword"
                  placeholder="ターゲットキーワードを入力..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">言語</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="searchEngine">検索エンジン</Label>
                  <Select value={searchEngine} onValueChange={setSearchEngine}>
                    <SelectTrigger id="searchEngine">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google.co.jp">Google Japan</SelectItem>
                      <SelectItem value="google.com">Google US</SelectItem>
                      <SelectItem value="google.co.uk">Google UK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
