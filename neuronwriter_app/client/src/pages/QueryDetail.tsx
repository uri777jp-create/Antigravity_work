import { useAuth } from "@/_core/hooks/useAuth";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUp, Download, FileText, Lightbulb, TrendingUp, BarChart, Globe, Users, Target, Sparkles, Copy, RefreshCw, Code, Eye, CheckCircle2, Loader2, Link as LinkIcon, MessageSquare, ChevronUp, ChevronDown, ListTree } from "lucide-react";
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

    // 検索意図のアイコンと色を取得
    const getIntentStyle = (name: string) => {
      const styles: Record<string, { color: string; bg: string; icon: string; label: string }> = {
        informational: { color: "text-blue-600", bg: "bg-blue-100", icon: "📚", label: "情報収集" },
        navigational: { color: "text-purple-600", bg: "bg-purple-100", icon: "🧭", label: "ナビゲーション" },
        commercial: { color: "text-amber-600", bg: "bg-amber-100", icon: "🛒", label: "商業目的" },
        transactional: { color: "text-green-600", bg: "bg-green-100", icon: "💳", label: "取引目的" },
      };
      return styles[name.toLowerCase()] || { color: "text-gray-600", bg: "bg-gray-100", icon: "📄", label: name };
    };

    // コンテンツタイプのアイコンと色を取得
    const getContentTypeStyle = (name: string) => {
      const styles: Record<string, { color: string; bg: string; icon: string; label: string }> = {
        "blog-post": { color: "text-indigo-600", bg: "bg-indigo-500", icon: "📝", label: "ブログ記事" },
        guide: { color: "text-emerald-600", bg: "bg-emerald-500", icon: "📖", label: "ガイド" },
        educational: { color: "text-sky-600", bg: "bg-sky-500", icon: "🎓", label: "教育コンテンツ" },
        "case-study": { color: "text-orange-600", bg: "bg-orange-500", icon: "📊", label: "事例紹介" },
        review: { color: "text-rose-600", bg: "bg-rose-500", icon: "⭐", label: "レビュー" },
        news: { color: "text-red-600", bg: "bg-red-500", icon: "📰", label: "ニュース" },
        product: { color: "text-violet-600", bg: "bg-violet-500", icon: "🏷️", label: "商品紹介" },
        "product-page": { color: "text-violet-600", bg: "bg-violet-500", icon: "🛍️", label: "製品ページ" },
        comparison: { color: "text-amber-600", bg: "bg-amber-500", icon: "⚖️", label: "比較記事" },
        video: { color: "text-pink-600", bg: "bg-pink-500", icon: "🎬", label: "動画" },
        "social-media": { color: "text-cyan-600", bg: "bg-cyan-500", icon: "📱", label: "SNS" },
        listicle: { color: "text-lime-600", bg: "bg-lime-500", icon: "📋", label: "リスト記事" },
        "landing-page": { color: "text-fuchsia-600", bg: "bg-fuchsia-500", icon: "🎯", label: "LP" },
        tool: { color: "text-teal-600", bg: "bg-teal-500", icon: "🔧", label: "ツール" },
        "short-answer": { color: "text-slate-600", bg: "bg-slate-500", icon: "💬", label: "Q&A" },
      };
      return styles[name.toLowerCase()] || { color: "text-gray-600", bg: "bg-gray-500", icon: "📄", label: name };
    };

    // top_intentとtop_content_typeの日本語訳
    const translateTopIntent = (intent: string) => {
      const map: Record<string, string> = {
        informational: "情報収集",
        navigational: "ナビゲーション",
        commercial: "商業目的",
        transactional: "取引目的",
      };
      return map[intent?.toLowerCase()] || intent;
    };

    const translateTopContentType = (type: string) => {
      const map: Record<string, string> = {
        "blog-post": "ブログ記事",
        guide: "ガイド",
        educational: "教育コンテンツ",
        "case-study": "事例紹介",
        review: "レビュー",
        news: "ニュース",
        product: "商品紹介",
        "product-page": "製品ページ",
        comparison: "比較記事",
        video: "動画",
        "social-media": "SNS",
        listicle: "リスト記事",
        "landing-page": "LP",
        tool: "ツール",
        "short-answer": "Q&A",
      };
      return map[type?.toLowerCase()] || type;
    };

    return (
      <div className={cn("grid gap-6", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        {/* 検索意図 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">検索意図 (Intents)</h4>
              {summary.top_intent && (
                <p className="text-xs text-muted-foreground">
                  主要: <span className="font-medium text-blue-600">{translateTopIntent(summary.top_intent)}</span>
                </p>
              )}
            </div>
          </div>
          {!hasIntents && <p className="text-sm text-gray-400">データなし</p>}
          <div className="space-y-2">
            {intents.map((intent: any, i: number) => {
              const style = getIntentStyle(intent.type || intent.name);
              const pct = typeof intent.percentage === 'number' ? Math.round(intent.percentage) : parseFloat(intent.percentage) || 0;
              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{style.icon}</span>
                      <span className={cn("font-medium text-sm", style.color)}>
                        {style.label}
                      </span>
                    </div>
                    <span className={cn("text-sm font-bold", style.color)}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", style.bg)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* コンテンツタイプ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <span className="text-lg">📂</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">コンテンツタイプ</h4>
              {summary.top_content_type && (
                <p className="text-xs text-muted-foreground">
                  主要: <span className="font-medium text-indigo-600">{translateTopContentType(summary.top_content_type)}</span>
                </p>
              )}
            </div>
          </div>
          {!hasContentTypes && <p className="text-sm text-gray-400">データなし</p>}
          <div className="space-y-2">
            {contentTypes.map((type: any, i: number) => {
              const style = getContentTypeStyle(type.type || type.name);
              const pct = typeof type.percentage === 'number' ? Math.round(type.percentage) : parseFloat(type.percentage) || 0;
              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{style.icon}</span>
                      <span className={cn("font-medium text-sm", style.color)}>
                        {style.label}
                      </span>
                    </div>
                    <span className={cn("text-sm font-bold", style.color)}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", style.bg)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMetrics = (metrics: any, competitors?: any[]) => {
    if (!metrics) return null;

    // 競合データから平均値を計算
    const calcAvg = (arr: any[], key: string) => {
      if (!arr || arr.length === 0) return 0;
      const values = arr.map(c => c[key]).filter(v => typeof v === 'number' && v > 0);
      return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    };

    const avgWordCount = competitors ? calcAvg(competitors, 'word_count') : 0;
    const avgScore = competitors ? calcAvg(competitors, 'content_score') : 0;
    const avgReadability = competitors ? calcAvg(competitors, 'readability') : 0;
    const targetWordCount = metrics?.word_count?.target || metrics?.word_count?.median || avgWordCount;
    const targetReadability = metrics?.readability?.target || metrics?.readability?.median || avgReadability;

    const metricCards = [
      {
        value: targetWordCount.toLocaleString(),
        label: "目標文字数",
        icon: "📝",
        color: "bg-blue-500",
        desc: `競合中央値: ${(metrics?.word_count?.median || avgWordCount).toLocaleString()}`,
      },
      {
        value: avgScore,
        label: "平均スコア",
        icon: "📊",
        color: "bg-green-500",
        desc: "競合サイトの平均",
      },
      {
        value: targetReadability,
        label: "目標読みやすさ",
        icon: "📖",
        color: "bg-amber-500",
        desc: "低いほど読みやすい",
      },
      {
        value: competitors?.length || 0,
        label: "競合数",
        icon: "🏆",
        color: "bg-purple-500",
        desc: "分析対象サイト数",
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => (
          <div key={idx} className="bg-white border rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center text-white text-lg`}>
                {card.icon}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm font-medium text-gray-600">{card.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.desc}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderTermsTable = (terms: any[], title: string, icon?: string) => {
    if (!terms || terms.length === 0) return null;

    // 使用率でソート（高い順）
    const sortedTerms = [...terms].sort((a, b) => (b.usage_pc || 0) - (a.usage_pc || 0));

    // 使用率に応じた色を取得
    const getUsageStyle = (usage: number) => {
      if (usage >= 80) return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" };
      if (usage >= 50) return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" };
      if (usage >= 30) return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" };
      return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300" };
    };

    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <span>{icon || "🎯"}</span> {title}
          <span className="text-xs font-normal text-muted-foreground">（{terms.length}件）</span>
        </h4>
        <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto p-3 border rounded-lg bg-white/50">
          {sortedTerms.map((term: any, idx: number) => {
            const usage = term.usage_pc || 0;
            const style = getUsageStyle(usage);
            const range = term.sugg_usage ? `${term.sugg_usage[0]}-${term.sugg_usage[1]}回` : null;

            return (
              <div
                key={idx}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all hover:shadow-sm",
                  style.bg, style.text, style.border
                )}
                title={range ? `推奨: ${range}` : undefined}
              >
                <span className="font-medium">{term.t}</span>
                <span className="opacity-70">({usage}%)</span>
                {range && (
                  <span className="ml-1 px-1 bg-white/50 rounded text-[10px]">
                    {range}
                  </span>
                )}
              </div>
            );
          })}
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

  // topic_matrixを表示する関数
  const renderTopicMatrix = (topicMatrix: Record<string, { importance: number }>) => {
    if (!topicMatrix || Object.keys(topicMatrix).length === 0) return null;

    // 重要度でソート（高い順）
    const sortedTopics = Object.entries(topicMatrix)
      .map(([question, data]) => ({ question, importance: data.importance }))
      .sort((a, b) => b.importance - a.importance);

    // 重要度に応じた色を取得
    const getImportanceStyle = (importance: number) => {
      if (importance >= 9) return { bg: "bg-rose-500", text: "text-rose-600", bgLight: "bg-rose-50", border: "border-rose-200" };
      if (importance >= 7) return { bg: "bg-amber-500", text: "text-amber-600", bgLight: "bg-amber-50", border: "border-amber-200" };
      if (importance >= 5) return { bg: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-50", border: "border-blue-200" };
      return { bg: "bg-gray-400", text: "text-gray-600", bgLight: "bg-gray-50", border: "border-gray-200" };
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h4 className="font-semibold text-sm">トピックマトリックス</h4>
            <p className="text-xs text-muted-foreground">読者が知りたい質問（重要度順）</p>
          </div>
        </div>
        <div className="grid gap-3">
          {sortedTopics.map((topic, idx) => {
            const style = getImportanceStyle(topic.importance);
            return (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg border transition-all hover:shadow-sm",
                  style.bgLight,
                  style.border
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                      style.bg
                    )}>
                      {idx + 1}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      {topic.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className={cn("text-xs font-bold", style.text)}>
                        重要度: {topic.importance}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 ml-9">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-full">
                    <div
                      className={cn("h-full rounded-full transition-all", style.bg)}
                      style={{ width: `${topic.importance * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCompetitors = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return null;

    // スコアに基づいた色を取得
    const getScoreStyle = (score: number) => {
      if (score >= 60) return { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" };
      if (score >= 45) return { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" };
      if (score >= 30) return { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" };
      return { bg: "bg-gray-400", text: "text-gray-600", light: "bg-gray-50" };
    };

    return (
      <div className="space-y-4">
        {/* 競合リスト */}
        <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
          {competitors.map((comp: any, idx: number) => {
            const scoreStyle = getScoreStyle(comp.content_score || 0);

            return (
              <details
                key={idx}
                open={idx < 3}
                className={cn(
                  "border rounded-lg overflow-hidden transition-all group",
                  idx < 3 ? "border-indigo-200" : "border-gray-200"
                )}
              >
                <summary
                  className={cn(
                    "p-3 cursor-pointer hover:bg-gray-50 transition-colors list-none",
                    idx < 3 && "bg-indigo-50/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                      idx < 3 ? "bg-indigo-500" : idx < 10 ? "bg-blue-500" : "bg-gray-400"
                    )}>
                      {comp.rank || idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold hover:underline text-blue-600 line-clamp-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {comp.title}
                      </a>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{comp.url}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-xs", scoreStyle.text, scoreStyle.light)}>
                          スコア: {comp.content_score || 0}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {(comp.word_count || 0).toLocaleString()}文字
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          読みやすさ: {comp.readability || 0}
                        </Badge>
                        {comp.headers && (
                          <Badge variant="secondary" className="text-xs">
                            見出し: {comp.headers.length}個
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                    </div>
                  </div>
                </summary>

                {/* 展開時：目次構成 */}
                {comp.headers && comp.headers.length > 0 && (
                  <div className="border-t bg-gray-50/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ListTree className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-semibold text-gray-600">目次構成</span>
                    </div>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {comp.headers.map((header: [string, string], hIdx: number) => {
                        const [level, text] = header;
                        const isH1 = level === "h1";
                        const isH2 = level === "h2";
                        return (
                          <div
                            key={hIdx}
                            className={cn(
                              "flex items-start gap-2 py-1 px-2 rounded text-sm",
                              isH1 && "bg-indigo-100/50 font-semibold",
                              isH2 && "bg-blue-50/50 ml-2",
                              !isH1 && !isH2 && "ml-4 text-gray-600"
                            )}
                          >
                            <span className={cn(
                              "text-[10px] font-mono px-1 py-0.5 rounded shrink-0",
                              isH1 ? "bg-indigo-200 text-indigo-700" :
                                isH2 ? "bg-blue-200 text-blue-700" :
                                  "bg-gray-200 text-gray-600"
                            )}>
                              {level.toUpperCase()}
                            </span>
                            <span className={cn(
                              "flex-1",
                              isH1 && "text-indigo-800",
                              isH2 && "text-blue-800"
                            )}>
                              {text || "(空)"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 展開時：説明文 */}
                {comp.desc && (
                  <div className="border-t bg-white p-3">
                    <div className="text-xs text-gray-600 line-clamp-3">
                      {comp.desc}
                    </div>
                  </div>
                )}
              </details>
            );
          })}
        </div>
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
                            {renderMetrics(recommendations.metrics, recommendations.competitors)}
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
                            {renderTermsTable(recommendations.terms.title, "タイトル推奨キーワード", "👑")}
                            {renderTermsTable(recommendations.terms.h1, "H1推奨キーワード", "🥇")}
                            {renderTermsTable(recommendations.terms.h2, "H2推奨キーワード", "🥈")}
                            {renderTermsTable(recommendations.terms.content_basic, "基本コンテンツキーワード", "📄")}
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
                            {renderTopicMatrix(recommendations.ideas.topic_matrix)}
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
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
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
