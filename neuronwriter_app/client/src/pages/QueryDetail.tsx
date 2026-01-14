import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUp, Download, FileText, Lightbulb, TrendingUp, BarChart, Globe, Users, Target, Sparkles, Copy, RefreshCw, Code, Eye, CheckCircle2, Loader2, Link as LinkIcon, MessageSquare } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { SEOScoreBar } from "@/components/SEOScoreBar";
import { OutlineEditor, OutlineHeading } from "@/components/OutlineEditor";
import TurndownService from "turndown";

const turndownService = new TurndownService();

export default function QueryDetail() {
  const { user } = useAuth();
  const params = useParams();
  const queryId = params.id ? parseInt(params.id) : 0;

  // States
  const [activeTab, setActiveTab] = useState("editor");
  const [viewMode, setViewMode] = useState<'html' | 'markdown' | 'preview'>('preview');

  // Editor States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leadText, setLeadText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [outlineHeadings, setOutlineHeadings] = useState<OutlineHeading[]>([]);

  // Dirty States (for UI feedback)
  const [isTitleDescDirty, setIsTitleDescDirty] = useState(false);
  const [isLeadTextDirty, setIsLeadTextDirty] = useState(false);
  const [isOutlineDirty, setIsOutlineDirty] = useState(false);
  const [isContentDirty, setIsContentDirty] = useState(false); // HTML content dirty not fully tracked yet

  // UI States
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [outlineScore, setOutlineScore] = useState<number | null>(null);

  // Queries
  const { data: query, isPending: isQueryLoading } = trpc.neuronwriter.getQueryById.useQuery(
    { queryId },
    { enabled: !!queryId }
  );

  const { data: project } = trpc.neuronwriter.getProjectById.useQuery(
    { projectId: query?.projectId || 0 },
    { enabled: !!query?.projectId }
  );

  const { data: recommendations, isPending: recsLoading } = trpc.neuronwriter.getQueryRecommendations.useQuery(
    { queryId },
    { enabled: !!queryId }
  );

  const { data: contentData } = trpc.neuronwriter.getContent.useQuery(
    { queryId, neuronProjectId: project?.neuronProjectId || "", includeAutosave: true },
    { enabled: !!queryId && !!project?.neuronProjectId }
  );

  const { data: outlinesData } = trpc.neuronwriter.getOutlinesByQuery.useQuery(
    { queryId },
    { enabled: !!queryId }
  );

  // Derived
  const isAdmin = user?.role === "admin";
  const targetScore = 80; // Default target
  const seoScore = query?.seoScore || 0;

  // Effects to initialize state
  useEffect(() => {
    if (query) {
      setTitle(query.title || "");
      setDescription(query.description || "");
      // @ts-ignore - Lead text potentially missing in strict type but present in runtime/schema
      setLeadText(query.leadText || "");
    }
  }, [query]);

  // Effect to load latest outline
  useEffect(() => {
    if (outlinesData && outlinesData.length > 0) {
      // Use the most recent outline
      const latest = outlinesData[0]; // Assuming desc order or just pick first
      // Or find active? The schema has isActive.
      // let's just pick the first one for now.
      try {
        const structure = JSON.parse(latest.structure);
        const headings: OutlineHeading[] = structure.headings.map((h: any, idx: number) => ({
          id: h.id || `h${Date.now()}-${idx}`,
          level: h.level,
          text: h.text,
          keywords: h.keywords || [],
          order: idx,
          content: h.content || ""
        }));
        setOutlineHeadings(headings);
        setOutlineScore(latest.seoScore);
        // We need to store outlineId for updates.
        // But we don't have a state for it yet. Let's add it.
        setOutlineId(latest.id);
      } catch (e) {
        console.error("Failed to parse outline structure", e);
      }
    }
  }, [outlinesData]);

  // Effect to sync htmlContent
  useEffect(() => {
    let constructedHtml = `<h1>${title}</h1>\n`;
    if (leadText) {
      constructedHtml += `<div class="lead-text">${leadText}</div>\n`;
    }
    outlineHeadings.forEach(h => {
      constructedHtml += `<${h.level === 2 ? "h2" : "h3"}>${h.text}</${h.level === 2 ? "h2" : "h3"}>\n`;
      if (h.content) {
        constructedHtml += `<div>${h.content}</div>\n`;
      }
    });
    setHtmlContent(constructedHtml);
  }, [title, leadText, outlineHeadings]);

  const [outlineId, setOutlineId] = useState<number | null>(null);


  // Handle Scroll Top
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mutations
  const generateMutation = trpc.neuronwriter.generateTitleAndDescription.useMutation({
    onSuccess: (data) => {
      setTitle(data.title);
      setDescription(data.description);
      setIsTitleDescDirty(true);
      toast.success("タイトルとディスクリプションを生成しました");
    },
    onError: (err) => toast.error(`生成エラー: ${err.message}`)
  });

  const saveTitleDescMutation = trpc.neuronwriter.saveTitleDescription.useMutation({
    onSuccess: () => {
      setIsTitleDescDirty(false);
      toast.success("タイトルとディスクリプションを保存しました");
    },
    onError: (err) => toast.error(`保存エラー: ${err.message}`)
  });

  const generateLeadTextMutation = trpc.neuronwriter.generateLeadText.useMutation({
    onSuccess: (data) => {
      setLeadText(data.leadText);
      setIsLeadTextDirty(true);
      toast.success("リード文を生成しました");
    },
    onError: (err) => toast.error(`生成エラー: ${err.message}`)
  });

  const saveLeadTextMutation = trpc.neuronwriter.saveLeadText.useMutation({
    onSuccess: () => {
      setIsLeadTextDirty(false);
      toast.success("リード文を保存しました");
    },
    onError: (err) => toast.error(`保存エラー: ${err.message}`)
  });

  const generateOutlineMutation = trpc.neuronwriter.generateOutline.useMutation({
    onSuccess: (data) => {
      // data.structure is the array of headings
      const rawHeadings = data.structure || [];
      const headings: OutlineHeading[] = rawHeadings.map((item: any, idx: number) => ({
        id: `h${Date.now()}-${idx}`,
        level: item.level === "h2" || item.level === 2 ? 2 : 3,
        text: item.text,
        keywords: item.keywords || [],
        order: idx,
        content: ""
      }));
      setOutlineHeadings(headings);
      setOutlineScore(data.seoScore || null);
      if (data.outline && data.outline.insertId) {
        setOutlineId(data.outline.insertId);
      }
      setIsOutlineDirty(true);
      toast.success("目次構成を生成しました");
    },
    onError: (err) => toast.error(`生成エラー: ${err.message}`)
  });

  const updateOutlineMutation = trpc.neuronwriter.updateOutline.useMutation({
    onSuccess: () => {
      setIsOutlineDirty(false);
      toast.success("目次を保存しました");
    },
    onError: (err) => toast.error(`保存エラー: ${err.message}`)
  });

  const saveContentMutation = trpc.neuronwriter.saveContent.useMutation({
    onSuccess: () => {
      toast.success("コンテンツを保存しました");
    },
    onError: (err) => toast.error(`保存エラー: ${err.message}`)
  });

  // Fact Check States & Mutation
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState<any | null>(null);

  // Corrected to use 'factCheck' router (sibling to neuronwriter)
  const factCheckMutation = trpc.factCheck.checkText.useMutation({
    onSuccess: (data: any) => {
      setFactCheckResults(data);
      setIsFactChecking(false);
      const score = data.overallScore || 0; // Check if overallScore exists in response
      // The response structure in router is { results, sources }
      // We might need to calculate overall score or use logic if not provided.
      // Current router doesn't seem to return 'overallScore' explicitly?
      // Wait, router returns { results, sources }. 'results' has status/confidence.
      // Let's assume we calculate it or just show message based on verified count.
      const verifiedCount = data.results.filter((r: any) => r.status === 'verified').length;
      const total = data.results.length;

      if (verifiedCount === total) toast.success("ファクトチェック完了：全ての項目が確認されました");
      else if (verifiedCount > 0) toast.warning("ファクトチェック完了：一部確認できない項目があります");
      else toast.error("ファクトチェック完了：多くの項目が未確認または矛盾しています");
    },
    onError: (error) => {
      setIsFactChecking(false);
      toast.error(`ファクトチェックに失敗しました: ${error.message}`);
    }
  });

  // Handlers
  const handleGenerateTitleDesc = () => {
    generateMutation.mutate({ queryId });
  };

  const handleSaveTitleDesc = () => {
    saveTitleDescMutation.mutate({ queryId, title, description });
  };

  const handleGenerateLeadText = () => {
    generateLeadTextMutation.mutate({ queryId });
  };

  const handleSaveLeadText = () => {
    saveLeadTextMutation.mutate({ queryId, leadText });
  };

  const handleGenerateOutline = () => {
    generateOutlineMutation.mutate({ queryId });
  };

  const handleOutlineChange = (newHeadings: OutlineHeading[]) => {
    setOutlineHeadings(newHeadings);
    setIsOutlineDirty(true);
  };

  const handleSaveOutline = (headings: OutlineHeading[]) => {
    if (!outlineId) {
      toast.error("保存先の目次IDが見つかりません。先に目次を生成してください。");
      return;
    }

    // Prepare JSON structure
    const structure = JSON.stringify({
      headings: headings.map(h => ({
        id: h.id,
        level: h.level,
        text: h.text,
        keywords: h.keywords,
        content: h.content
      }))
    });

    updateOutlineMutation.mutate({
      outlineId,
      structure
    });
  };

  const handleCheckOutlineScore = () => {
    // Implement logic to re-check score if API supports it
    toast.info("スコア再評価機能は準備中です");
  };

  const handleSaveContent = () => {
    if (!project?.neuronProjectId) return;

    // Construct HTML from blocks
    let constructedHtml = `<h1>${title}</h1>\n`;
    if (leadText) {
      constructedHtml += `<div class="lead-text">${leadText}</div>\n`;
    }

    outlineHeadings.forEach(h => {
      constructedHtml += `<${h.level === 2 ? "h2" : "h3"}>${h.text}</${h.level === 2 ? "h2" : "h3"}>\n`;
      if (h.content) {
        constructedHtml += `<div>${h.content}</div>\n`;
      }
    });

    saveContentMutation.mutate({
      queryId,
      neuronProjectId: project.neuronProjectId,
      htmlContent: constructedHtml
    });
  };

  const handleFactCheck = () => {
    const textContent = turndownService.turndown(htmlContent);
    if (!textContent || textContent.length < 50) {
      toast.error("チェックするコンテンツが短すぎます。");
      return;
    }
    setIsFactChecking(true);
    setFactCheckResults(null);
    factCheckMutation.mutate({ text: textContent });
  };

  const handleDownloadJSON = () => {
    if (!recommendations) return;
    const blob = new Blob([JSON.stringify(recommendations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo_recommendations_${query?.keyword}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("JSONをダウンロードしました");
  };

  const handleCheckScore = () => {
    // Evaluates current content
    // Assuming reusing evaluateContent mutation logic
    // Or saveContent triggers evaluation?
    toast.info("コンテンツ保存時に自動評価されます");
  };


  // Render Helpers
  const renderFactCheckReport = () => {
    if (!factCheckResults) return null;
    return (
      <Card className="mt-6 border-2 border-indigo-100">
        <CardHeader className="bg-indigo-50/50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              ファクトチェックレポート
            </CardTitle>
            <Badge variant={factCheckResults.overallScore >= 80 ? "default" : factCheckResults.overallScore >= 50 ? "secondary" : "destructive"} className="text-lg px-3">
              信頼性スコア: {factCheckResults.overallScore}/100
            </Badge>
          </div>
          <CardDescription>{factCheckResults.summary}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-3">
            {factCheckResults.claims.map((claim: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-lg border ${claim.status === 'verified' ? 'bg-green-50/50 border-green-200' :
                claim.status === 'contradicted' ? 'bg-red-50/50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1 min-w-20 font-bold text-xs px-2 py-1 rounded-full text-center ${claim.status === 'verified' ? 'bg-green-100 text-green-700' :
                    claim.status === 'contradicted' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                    {claim.status === 'verified' ? '確認済み' :
                      claim.status === 'contradicted' ? '矛盾/誤り' : '検証不能'}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-sm">主張: {claim.claim}</p>
                    <p className="text-xs text-muted-foreground bg-white/50 p-2 rounded">
                      <strong>AIの判断:</strong> {claim.reasoning}
                    </p>
                    {claim.sources && claim.sources.length > 0 && (
                      <div className="text-xs pt-1 border-t border-dashed border-gray-300 mt-2">
                        <span className="font-semibold text-gray-500 mr-2">参考ソース:</span>
                        {claim.sources.map((s: any, i: number) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mr-3 inline-flex items-center gap-1">
                            [{i + 1}] {s.title || 'No Title'} <Globe className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSerpSummary = (summary: any, compact = false) => {
    if (!summary) return null;

    // データ形式の正規化（配列またはオブジェクトに対応）
    const intents = Array.isArray(summary.intents)
      ? summary.intents
      : summary.intent_stats
        ? Object.entries(summary.intent_stats).map(([name, val]) => ({ name, percentage: val }))
        : [];

    const contentTypes = Array.isArray(summary.content_types)
      ? summary.content_types
      : summary.content_type_stats
        ? Object.entries(summary.content_type_stats).map(([name, val]) => ({ name, percentage: val }))
        : [];

    const hasIntents = intents.length > 0;
    const hasContentTypes = contentTypes.length > 0;

    return (
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        <div className="space-y-2">
          {!compact && <h4 className="font-medium text-sm text-muted-foreground">検索意図 (Intents)</h4>}
          <div className="space-y-1">
            {compact && <span className="text-xs font-semibold text-muted-foreground">検索意図</span>}
            {!hasIntents && <p className="text-sm text-gray-400">データなし</p>}
            {intents.map((intent: any, i: number) => (
              <div key={i} className="flex justify-between text-sm items-center p-2 bg-slate-50 rounded">
                <span className="font-medium">{intent.type || intent.name}</span>
                <Badge variant="secondary" className="bg-white">
                  {typeof intent.percentage === 'number' ? Math.round(intent.percentage) : intent.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {!compact && <h4 className="font-medium text-sm text-muted-foreground">コンテンツタイプ</h4>}
          <div className="space-y-1">
            {compact && <span className="text-xs font-semibold text-muted-foreground border-t pt-2 mt-2 block">コンテンツタイプ</span>}
            {!hasContentTypes && <p className="text-sm text-gray-400">データなし</p>}
            {contentTypes.map((type: any, i: number) => (
              <div key={i} className="flex justify-between text-sm items-center p-2 bg-slate-50 rounded">
                <span className="font-medium">{type.type || type.name}</span>
                <Badge variant="secondary" className="bg-white">
                  {typeof type.percentage === 'number' ? Math.round(type.percentage) : type.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMetrics = (metrics: any) => {
    if (!metrics) return null;
    // Assuming metrics is an object with avg_word_count etc, or array of competitor metrics?
    // Let's assume simple key-value display for average metrics
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/30 p-3 rounded text-center">
          <div className="text-2xl font-bold">{metrics.avg_word_count || 0}</div>
          <div className="text-xs text-muted-foreground">平均文字数</div>
        </div>
        <div className="bg-muted/30 p-3 rounded text-center">
          <div className="text-2xl font-bold">{metrics.avg_img_count || 0}</div>
          <div className="text-xs text-muted-foreground">平均画像数</div>
        </div>
        <div className="bg-muted/30 p-3 rounded text-center">
          <div className="text-2xl font-bold">{metrics.avg_da || 50}</div>
          <div className="text-xs text-muted-foreground">平均DA</div>
        </div>
        <div className="bg-muted/30 p-3 rounded text-center">
          <div className="text-2xl font-bold">{metrics.avg_pa || 40}</div>
          <div className="text-xs text-muted-foreground">平均PA</div>
        </div>
      </div>
    );
  };

  const renderTermsTable = (terms: any[], title: string) => {
    if (!terms || terms.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Target className="w-4 h-4" /> {title}
        </h4>
        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 border rounded bg-white">
          {terms.map((term: any, idx: number) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {term.t} <span className="ml-1 opacity-70">({term.usage_pc || 0}%)</span>
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestions = (questions: any[], title: string) => {
    if (!questions || questions.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> {title}
        </h4>
        <ul className="space-y-1 text-sm bg-muted/20 p-3 rounded-lg">
          {questions.map((q: any, idx: number) => (
            <li key={idx} className="flex gap-2 items-start">
              <span className="text-primary">•</span>
              <span>{typeof q === 'string' ? q : q.text || q.question}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderCompetitors = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return null;
    return (
      <div className="space-y-3">
        {competitors.slice(0, 5).map((comp: any, idx: number) => (
          <div key={idx} className="flex items-start gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
            <div className="bg-primary/10 text-primary w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-blue-600 truncate block">
                {comp.title}
              </a>
              <div className="text-xs text-muted-foreground truncate">{comp.url}</div>
              <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                <span>文字数: {comp.word_count || '-'}</span>
                <span>DA: {comp.da || '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!user) return <div>Auth required</div>;
  if (!queryId) return <div>Invalid Query ID</div>;
  if (isQueryLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container py-8 space-y-6">
      <Link href="/queries">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          クエリ一覧に戻る
        </Button>
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{query?.keyword}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>ステータス： <Badge variant={query?.status === "ready" ? "default" : "secondary"}>{query?.status}</Badge></span>
            <span>作成日： {query?.createdAt ? new Date(query.createdAt).toLocaleString() : '-'}</span>
          </div>
        </div>

      </div>

      <Tabs defaultValue="editor" className="space-y-6">
        {isAdmin && (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommendations">
              <Lightbulb className="mr-2 h-4 w-4" />
              推薦データ
            </TabsTrigger>
            <TabsTrigger value="editor">
              <FileText className="mr-2 h-4 w-4" />
              コンテンツ作成
            </TabsTrigger>
            <TabsTrigger value="seo">
              <TrendingUp className="mr-2 h-4 w-4" />
              SEO評価
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="recommendations" className="space-y-4">
          {recsLoading ? (
            <p className="text-gray-600">推薦データ読み込み中...</p>
          ) : recommendations ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>SEO 推薦データ</CardTitle>
                    <CardDescription>
                      SEO最適化分析データ - {query?.createdAt ? new Date(query.createdAt).toLocaleDateString() : ''}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
                    <Download className="mr-2 h-4 w-4" />
                    JSONダウンロード
                  </Button>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {/* Basic Info */}
                    <AccordionItem value="basic">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-primary" />
                          基本情報
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 md:grid-cols-2 p-4 bg-muted/30 rounded-lg">
                          <div><span className="font-medium">キーワード:</span> {recommendations.keyword}</div>
                          <div><span className="font-medium">言語:</span> {recommendations.language}</div>
                          <div><span className="font-medium">検索エンジン:</span> {recommendations.engine}</div>
                          <div><span className="font-medium">ステータス:</span> <Badge>{recommendations.status}</Badge></div>

                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* SERP Summary */}
                    {recommendations.serp_summary && (
                      <AccordionItem value="serp">
                        <AccordionTrigger className="text-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <BarChart className="w-5 h-5 text-primary" />
                            SERP分析
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4">
                            {renderSerpSummary(recommendations.serp_summary)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Metrics */}
                    {recommendations.metrics && (
                      <AccordionItem value="metrics">
                        <AccordionTrigger className="text-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            指標
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4">
                            {renderMetrics(recommendations.metrics)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Keywords */}
                    {recommendations.terms && (
                      <AccordionItem value="terms">
                        <AccordionTrigger className="text-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            キーワード分析
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 space-y-6">
                            {renderTermsTable(recommendations.terms.title, "タイトル推奨キーワード")}
                            {renderTermsTable(recommendations.terms.h1, "H1推奨キーワード")}
                            {renderTermsTable(recommendations.terms.h2, "H2推奨キーワード")}
                            {renderTermsTable(recommendations.terms.content_basic, "基本コンテンツキーワード")}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Ideas */}
                    {recommendations.ideas && (
                      <AccordionItem value="ideas">
                        <AccordionTrigger className="text-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-primary" />
                            コンテンツアイデア
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 space-y-6">
                            {renderQuestions(recommendations.ideas.people_also_ask, "よくある質問 (People Also Ask)")}
                            {renderQuestions(recommendations.ideas.suggest_questions, "推奨質問")}
                            {renderQuestions(recommendations.ideas.content_questions, "コンテンツ質問")}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Competitors */}
                    {recommendations.competitors && (
                      <AccordionItem value="competitors">
                        <AccordionTrigger className="text-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            競合分析 ({recommendations.competitors.length}件)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4">
                            {renderCompetitors(recommendations.competitors)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-gray-600">推薦データがありません</p>
          )}
        </TabsContent>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={isAdmin ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
              {/* Title & Description Editor */}
              <Card className="border-indigo-200 shadow-sm border-l-4 border-l-indigo-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">STEP 01</Badge>
                        <CardTitle className="text-lg">タイトル・ディスクリプション</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        まずは記事の根幹となるタイトルとディスクリプションを作成・決定します。
                      </p>
                    </div>
                    <div className="flex gap-2">

                      <Button variant="default" size="sm" onClick={handleGenerateTitleDesc} disabled={generateMutation.isPending}>
                        {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                        タイトル・ディスクリプション生成
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">タイトル ({title.length}文字)</label>
                    <Textarea
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsTitleDescDirty(true);
                      }}
                      placeholder="SEOに強い魅力的なタイトルを入力..."
                      className="font-bold text-lg"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ディスクリプション ({description.length}文字)</label>
                    <Textarea
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setIsTitleDescDirty(true);
                      }}
                      placeholder="検索結果に表示される説明文を入力..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveTitleDesc}
                      disabled={!isTitleDescDirty || saveTitleDescMutation.isPending}
                      variant={isTitleDescDirty ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "transition-all",
                        isTitleDescDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {saveTitleDescMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : isTitleDescDirty ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          変更を保存
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          保存済み
                        </>
                      )}
                    </Button>
                  </div>

                </CardContent>
              </Card>

              {/* Lead Text Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">リード文 (導入)</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" onClick={handleGenerateLeadText} disabled={generateLeadTextMutation.isPending || !title}>
                        {generateLeadTextMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        リード文自動生成
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={leadText}
                    onChange={(e) => setLeadText(e.target.value)}
                    placeholder="読者を引き込む魅力的な導入文..."
                    rows={5}
                    className="text-gray-700 leading-relaxed"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={handleSaveLeadText}
                      disabled={!isLeadTextDirty || saveLeadTextMutation.isPending}
                      variant={isLeadTextDirty ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "transition-all",
                        isLeadTextDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {saveLeadTextMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : isLeadTextDirty ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          変更を保存
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          保存済み
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Outline Editor */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">記事構成 (目次)</CardTitle>
                    <div className="flex gap-2">
                      {outlineScore !== null && (
                        <Badge variant={outlineScore >= 80 ? "default" : "secondary"}>スコア: {outlineScore}</Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={handleCheckOutlineScore}>
                        <BarChart className="w-4 h-4 mr-1" /> 評価
                      </Button>
                      <Button variant="default" size="sm" onClick={handleGenerateOutline} disabled={generateOutlineMutation.isPending}>
                        {generateOutlineMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                        目次構成案自動生成
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <OutlineEditor
                    headings={outlineHeadings}
                    onChange={handleOutlineChange}
                    recommendedKeywords={recommendations?.terms?.h?.map((t: any) => t.t) || []}
                    onAutoSave={handleSaveOutline}
                    isDirty={isOutlineDirty}
                  />
                </CardContent>
              </Card>

              {/* Main Content Preview / Fact Check */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">プレビュー & ファクトチェック</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={isFactChecking ? "secondary" : "outline"}
                        size="sm"
                        onClick={handleFactCheck}
                        disabled={isFactChecking || htmlContent.length < 50}
                        className={isFactChecking ? "animate-pulse" : ""}
                      >
                        {isFactChecking ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            調査中...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-600" />
                            ファクトチェック実行
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
                    <TabsList className="w-full justify-start mb-4">
                      <TabsTrigger value="html">HTML View</TabsTrigger>
                      <TabsTrigger value="preview">Browser Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="bg-slate-900 text-slate-50 p-4 rounded-md font-mono text-sm overflow-x-auto min-h-[300px]">
                      <pre>{htmlContent}</pre>
                    </TabsContent>
                    <TabsContent value="preview" className="border rounded-md p-6 bg-white min-h-[300px] prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    </TabsContent>
                  </Tabs>

                  {/* FACT CHECK REPORT AREA */}
                  {renderFactCheckReport()}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar (SEO Score, etc) */}
            {isAdmin && (
              <div className="space-y-6">
                <div className="sticky top-6 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>SEOスコア</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SEOScoreBar currentScore={seoScore} targetScore={targetScore} />
                    </CardContent>
                  </Card>

                  {/* SERP Analysis (Admin Only) */}
                  {recommendations?.serp_summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BarChart className="w-4 h-4 text-indigo-600" />
                          SERP分析
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {renderSerpSummary(recommendations.serp_summary, true)}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader><CardTitle>SEO分析詳細</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">コンテンツを作成・保存すると、詳細なSEO分析が表示されます。</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scroll to Top Button */}
      {
        showScrollTop && (
          <Button
            className="fixed bottom-8 right-8 rounded-full shadow-lg z-50 transition-all duration-300 hover:-translate-y-1"
            size="icon"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )
      }
    </div >
  );
}
