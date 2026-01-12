import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUp, Download, FileText, Lightbulb, TrendingUp, BarChart, Globe, Users, MessageSquare, Target, Sparkles, Copy, RefreshCw, Code, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useSearch } from "wouter";
import { toast } from "sonner";
import { SEOScoreBar } from "@/components/SEOScoreBar";
import { OutlineEditor, OutlineHeading } from "@/components/OutlineEditor";
import TurndownService from "turndown";

export default function QueryDetail() {
  const { id } = useParams();
  const queryId = parseInt(id || "0");
  const { user } = useAuth();
  const [htmlContent, setHtmlContent] = useState("<h1>Your content here...</h1>");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [lastSavedDescription, setLastSavedDescription] = useState("");
  const [lastSavedLeadText, setLastSavedLeadText] = useState("");
  const [leadText, setLeadText] = useState("");
  const [isGeneratingLeadText, setIsGeneratingLeadText] = useState(false);

  const isTitleDescDirty = title !== lastSavedTitle || description !== lastSavedDescription;
  const isLeadTextDirty = leadText !== lastSavedLeadText;
  const [seoScore, setSeoScore] = useState<number | null>(null);
  const [targetScore, setTargetScore] = useState<number>(70);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [outlineHeadings, setOutlineHeadings] = useState<OutlineHeading[]>([]);
  const [lastSavedOutlineHeadings, setLastSavedOutlineHeadings] = useState<OutlineHeading[]>([]);
  const [outlineScore, setOutlineScore] = useState<number | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // Deep comparison for outline dirty state
  const isOutlineDirty = JSON.stringify(outlineHeadings) !== JSON.stringify(lastSavedOutlineHeadings);

  // Scroll to top button state
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const [viewMode, setViewMode] = useState<'html' | 'preview' | 'markdown'>('html');
  const turndownService = new TurndownService({ headingStyle: 'atx' });

  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialTab = searchParams.get("tab");

  const isAdmin = user?.role === 'admin';
  const defaultTab = isAdmin ? (initialTab || "recommendations") : "editor";

  const { data: query, isLoading: queryLoading } = trpc.neuronwriter.getQueryById.useQuery({ queryId });

  // クエリデータからタイトル・ディスクリプション・リード文を初期化
  // クエリデータからタイトル・ディスクリプション・リード文を初期化
  useEffect(() => {
    if (query) {
      if (query.title) {
        setTitle(query.title);
        setLastSavedTitle(query.title);
      }
      if (query.description) {
        setDescription(query.description);
        setLastSavedDescription(query.description);
      }
      if (query.leadText) {
        setLeadText(query.leadText);
        setLastSavedLeadText(query.leadText);
      }
      if (query.seoScore) setSeoScore(query.seoScore);
    }
  }, [query]);
  const { data: project } = trpc.neuronwriter.getProjectById.useQuery(
    { projectId: query?.projectId || 0 },
    { enabled: !!query }
  );
  const { data: recommendations, isLoading: recsLoading } = trpc.neuronwriter.getQueryRecommendations.useQuery(
    { queryId },
    { enabled: !!query }
  );

  const saveContentMutation = trpc.neuronwriter.saveContent.useMutation({
    onSuccess: () => {
      toast.success("コンテンツを保存しました！");
    },
    onError: (error) => {
      toast.error(`コンテンツの保存に失敗しました： ${error.message}`);
    },
  });

  const saveTitleDescMutation = trpc.neuronwriter.saveTitleDescription.useMutation({
    onSuccess: (data) => {
      setLastSavedTitle(title);
      setLastSavedDescription(description);
      if (data.seoScore !== undefined) {
        setSeoScore(data.seoScore);
      }
      toast.success("タイトルとディスクリプションを保存しました！", {
        description: data.saved ? "クラウドに保存しました。" : "ローカルに保存しました",
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error(`保存に失敗しました： ${error.message}`);
    },
  });

  const evaluateMutation = trpc.neuronwriter.evaluateContent.useMutation({
    onSuccess: (data: { score?: number }) => {
      toast.success("コンテンツの分析が完了しました");
    },
    onError: (error) => {
      toast.error(`評価に失敗しました： ${error.message}`);
    },
  });

  // 目次関連のクエリ
  const { data: outlines, refetch: refetchOutlines } = trpc.neuronwriter.getOutlinesByQuery.useQuery(
    { queryId },
    { enabled: !!query }
  );

  // 目次データをDBから復元
  useEffect(() => {
    if (outlines && outlines.length > 0) {
      // 最新の目次を取得
      const latestOutline = outlines[outlines.length - 1];
      try {
        const parsed = JSON.parse(latestOutline.structure);
        if (parsed.headings && Array.isArray(parsed.headings)) {
          setOutlineHeadings(parsed.headings);
          setLastSavedOutlineHeadings(parsed.headings);
          if (latestOutline.seoScore) {
            setOutlineScore(latestOutline.seoScore);
          }
        }
      } catch (e) {
        console.error("目次データの解析に失敗:", e);
      }
    }
  }, [outlines]);

  const generateOutlineMutation = trpc.neuronwriter.generateOutline.useMutation({
    onSuccess: (data) => {
      setOutlineHeadings(data.structure);
      setLastSavedOutlineHeadings(data.structure);
      setOutlineScore(data.seoScore);
      setIsGeneratingOutline(false);

      // 目次データを再取得して永続化を確認
      refetchOutlines();

      const scoreIncrease = data.seoScore - (data.currentScore || 0);
      toast.success(`目次を生成・保存しました！`, {
        description: "上位サイトの分析に基づき目次を生成しました。",
        duration: 5000,
      });
    },
    onError: (error) => {
      setIsGeneratingOutline(false);
      toast.error(`目次の生成に失敗しました： ${error.message}`);
    },
  });

  const evaluateOutlineMutation = trpc.neuronwriter.evaluateOutline.useMutation({
    onSuccess: (data) => {
      setOutlineScore(Math.round(data.content_score || 0));
      toast.success("目次の分析が完了しました");
    },
    onError: (error) => {
      toast.error(`評価に失敗しました： ${error.message}`);
    },
  });

  // 目次保存mutation
  const updateOutlineMutation = trpc.neuronwriter.updateOutline.useMutation({
    onSuccess: () => {
      setLastSavedOutlineHeadings(outlineHeadings);
      refetchOutlines();
      toast.success(`目次を保存しました！`);
    },
    onError: (error) => {
      toast.error(`目次の保存に失敗しました： ${error.message}`);
    },
  });

  const evaluateTitleMutation = trpc.neuronwriter.evaluateTitleDescription.useMutation({
    onSuccess: (data: any) => {
      // SEOスコアを表示
      if (data && data.content_score !== undefined) {
        const score = Math.round(data.content_score);
        toast.success("分析が完了しました", {
          description: `文字数：${data.word_count || 0}文字`,
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      console.error("評価エラー:", error);
    },
  });

  // リード文生成mutation
  const generateLeadTextMutation = trpc.neuronwriter.generateLeadText.useMutation({
    onSuccess: (data) => {
      setLeadText(data.leadText);
      setLastSavedLeadText(data.leadText);
      setIsGeneratingLeadText(false);
      if (data.seoScore !== undefined) {
        setSeoScore(data.seoScore);
      }
      toast.success(`リード文を生成しました！`, {
        description: data.saved ? "クラウドに保存しました。" : "ローカルに保存しました",
        duration: 5000,
      });
    },
    onError: (error) => {
      setIsGeneratingLeadText(false);
      toast.error(`リード文の生成に失敗しました： ${error.message}`);
    },
  });

  // リード文保存mutation
  const saveLeadTextMutation = trpc.neuronwriter.saveLeadText.useMutation({
    onSuccess: (data) => {
      setLastSavedLeadText(leadText);
      if (data.seoScore !== undefined) {
        setSeoScore(data.seoScore);
      }
      toast.success(`リード文を保存しました！`, {
        description: data.saved ? "クラウドに保存しました。" : "ローカルに保存しました",
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error(`リード文の保存に失敗しました： ${error.message}`);
    },
  });

  const generateMutation = trpc.neuronwriter.generateTitleAndDescription.useMutation({
    onSuccess: (data) => {
      setTitle(data.title);
      setDescription(data.description);
      setLastSavedTitle(data.title);
      setLastSavedDescription(data.description);

      // クラウドに保存されたスコアを表示
      if (data.saved && data.seoScore !== undefined) {
        setSeoScore(data.seoScore);
        toast.success(`タイトルとディスクリプションを生成しました！`, {
          description: "クラウドに保存しました。",
          duration: 5000,
        });
      } else {
        toast.success("タイトルとディスクリプションを生成しました！");
      }
    },
    onError: (error) => {
      toast.error(`AI生成に失敗しました： ${error.message}`);
    },
  });

  const handleSaveContent = () => {
    if (!query) return;
    saveContentMutation.mutate({
      queryId,
      neuronProjectId: project?.neuronProjectId || "",
      htmlContent,
    });
  };

  const handleEvaluate = () => {
    if (!query) return;
    evaluateMutation.mutate({
      queryId,
      neuronProjectId: project?.neuronProjectId || "",
      htmlContent,
    });
  };

  const handleGenerateTitleDesc = () => {
    if (!query) return;
    generateMutation.mutate({ queryId });
  };

  const handleGenerateOutline = () => {
    if (!query) return;
    setIsGeneratingOutline(true);
    generateOutlineMutation.mutate({ queryId, targetScore });
  };

  const handleOutlineChange = (newHeadings: OutlineHeading[]) => {
    setOutlineHeadings(newHeadings);
    // 変更後、自動的に評価（デバウンス処理）
    if (newHeadings.length > 0) {
      const structure = JSON.stringify({ headings: newHeadings });
      evaluateOutlineMutation.mutate({ queryId, structure });
    }
  };

  const handleCheckOutlineScore = () => {
    if (outlineHeadings.length === 0) {
      toast.error("目次が空です。まず目次を生成してください。");
      return;
    }
    const structure = JSON.stringify({ headings: outlineHeadings });
    evaluateOutlineMutation.mutate({ queryId, structure });
  };

  // 目次保存ハンドラー
  const handleSaveOutline = useCallback((arg?: OutlineHeading[] | React.MouseEvent) => {
    // 引数が配列ならデータとして使用、イベントならStateを使用
    const targetHeadings = (Array.isArray(arg)) ? arg : outlineHeadings;

    if (!query || targetHeadings.length === 0) {
      toast.error("目次が空です。まず目次を生成してください。");
      return;
    }
    // 最新の目次IDを取得
    const latestOutline = outlines && outlines.length > 0 ? outlines[outlines.length - 1] : null;
    if (!latestOutline) {
      toast.error("保存する目次が見つかりません。先に目次を生成してください。");
      return;
    }
    const structure = JSON.stringify({ headings: targetHeadings });
    updateOutlineMutation.mutate({
      outlineId: latestOutline.id,
      structure,
    });
  }, [query, outlineHeadings, outlines, updateOutlineMutation]);

  // SEOスコア評価mutation
  const evaluateSeoMutation = trpc.neuronwriter.evaluateTitleDescription.useMutation({
    onSuccess: (data) => {
      setSeoScore(data.score);
      setIsEvaluating(false);
    },
    onError: (error) => {
      toast.error(`スコア評価に失敗しました: ${error.message}`);
      setIsEvaluating(false);
    },
  });

  // タイトル・ディスクリプション保存ハンドラー
  const handleSaveTitleDesc = useCallback(() => {
    if (!query || (!title && !description)) {
      toast.error("タイトルまたはディスクリプションを入力してください");
      return;
    }
    saveTitleDescMutation.mutate({
      queryId,
      title,
      description,
    });
  }, [query, queryId, title, description, saveTitleDescMutation]);

  // スコア確認ボタンのハンドラー
  const handleCheckScore = useCallback(() => {
    if (!query || (!title && !description)) {
      toast.error("タイトルまたはディスクリプションを入力してください");
      return;
    }
    setIsEvaluating(true);
    evaluateSeoMutation.mutate({
      queryId,
      title,
      description,
    });
  }, [query, queryId, title, description, evaluateSeoMutation]);

  // リード文生成ハンドラー
  const handleGenerateLeadText = useCallback(() => {
    if (!query) return;
    if (!title || !description) {
      toast.error("先にタイトルとディスクリプションを作成してください");
      return;
    }
    setIsGeneratingLeadText(true);
    generateLeadTextMutation.mutate({ queryId });
  }, [query, queryId, title, description, generateLeadTextMutation]);

  // リード文保存ハンドラー
  const handleSaveLeadText = useCallback(() => {
    if (!query || !leadText) {
      toast.error("リード文を入力してください");
      return;
    }
    saveLeadTextMutation.mutate({
      queryId,
      leadText,
    });
  }, [query, queryId, leadText, saveLeadTextMutation]);

  // リアルタイム更新（コンテンツ統合）
  useEffect(() => {
    // 構成要素からHTMLを構築
    let parts: string[] = [];

    // 1. タイトル - 本文には含めない（CMS側でタイトルとして扱うため）
    // if (title) {
    //   parts.push(`<h1>${title}</h1>`);
    // }

    // 2. リード文
    if (leadText) {
      // 簡易的なHTML変換（改行を考慮）
      const formattedLead = leadText.split('\n').filter(line => line.trim()).map(line => `<p class="lead">${line}</p>`).join('');
      parts.push(formattedLead);
    }

    // 3. 目次と本文
    if (outlineHeadings.length > 0) {
      outlineHeadings.forEach(h => {
        parts.push(`<h${h.level}>${h.text}</h${h.level}>`);
        if (h.content) {
          parts.push(h.content);
        }
      });
    }

    const aggregatedHtml = parts.join('\n\n');

    // 生成されたHTMLが既存のものと異なる場合のみ更新（ループ防止）
    // 初期ロード時の"<h1>Your content here...</h1>"は上書きする
    if (aggregatedHtml && (htmlContent === "<h1>Your content here...</h1>" || htmlContent !== aggregatedHtml)) {
      setHtmlContent(aggregatedHtml);
    }
  }, [title, leadText, outlineHeadings]);

  // リアルタイム更新（SEOスコア評価 - デバウンス処理）
  useEffect(() => {
    if (!query || (!title && !description)) return;

    const timeoutId = setTimeout(() => {
      // 評価対象のHTML（本文が空の場合は統合されたHTMLを使用）
      const contentToEvaluate = htmlContent !== "<h1>Your content here...</h1>" ? htmlContent : "";

      setIsEvaluating(true);
      evaluateSeoMutation.mutate({
        queryId,
        title,
        description,
        // htmlContentも含めて評価に送るとなお良いが、現状のAPIはタイトル・デスクメインか
      });
    }, 2000); // 2秒後に自動評価

    return () => clearTimeout(timeoutId);
  }, [title, description]); // queryIdとevaluateSeoMutationは依存配列から除外（無限ループ防止）

  const handleDownloadJSON = () => {
    if (!recommendations) return;
    const dataStr = JSON.stringify(recommendations, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analysis-${queryId}-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("JSONをダウンロードしました！");
  };

  const renderMetrics = (data: any) => {
    if (!data) return null;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {data.word_count && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">文字数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.word_count.target?.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">中央値: {data.word_count.median?.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
        {data.readability && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">可読性スコア</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.readability.target}</div>
              <p className="text-xs text-muted-foreground">中央値: {data.readability.median}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // 英語用語を日本語に変換するマッピング
  const translateIntent = (intent: string): string => {
    const intentMap: Record<string, string> = {
      'informational': '情報提供型',
      'transactional': '取引型',
      'navigational': 'ナビゲーション型',
      'commercial': '商業型'
    };
    return intentMap[intent] || intent;
  };

  const translateContentType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'listicle': 'リスト型記事',
      'comparison': '比較記事',
      'educational': '教育コンテンツ',
      'blog-post': 'ブログ記事',
      'business': 'ビジネスページ',
      'landing-page': 'ランディングページ',
      'news': 'ニュース記事',
      'video': '動画コンテンツ',
      'guide': 'ガイド記事',
      'product': '商品ページ',
      'review': 'レビュー記事',
      'tool': 'ツール',
      'product-category': '商品カテゴリ'
    };
    return typeMap[type] || type;
  };

  const renderSerpSummary = (data: any) => {
    if (!data) return null;
    return (
      <div className="space-y-4">
        {/* 説明パネル */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="text-blue-900">
            <strong>SERP分析とは？</strong> このキーワードで検索結果の上位に表示されているページの傾向を分析したデータです。
            検索意図（インテント）とコンテンツタイプを把握することで、効果的な記事構成を設計できます。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                主要インテント
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                検索ユーザーの主な目的・意図
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-lg">{translateIntent(data.top_intent)}</Badge>
              <div className="mt-3 space-y-1">
                {data.intent_stats && Object.entries(data.intent_stats).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{translateIntent(key)}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                主要コンテンツタイプ
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                上位ページで多く使われている記事形式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-lg">{translateContentType(data.top_content_type)}</Badge>
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {data.content_type_stats && Object.entries(data.content_type_stats).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{translateContentType(key)}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTermsTable = (terms: any[], title: string) => {
    if (!terms || terms.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">{title} ({terms.length}件)</h4>
        <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">キーワード</th>
                <th className="px-3 py-2 text-right">使用率 (%)</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">{term.t}</td>
                  <td className="px-3 py-2 text-right font-mono">{term.usage_pc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 見出し文字列を階層構造にパースする関数
  const parseHeadingsToHierarchy = (headersString: string) => {
    if (!headersString) return [];
    // "h1タイトルh2見出し1h3小見出し1h3小見出し2h2見出し2" のような形式をパース
    const regex = /(h[1-6])([^h]*)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(headersString)) !== null) {
      const level = match[1].toLowerCase();
      const text = match[2].trim();
      if (text) {
        matches.push({ level, text });
      }
    }
    return matches;
  };

  const renderCompetitors = (competitors: any[]) => {
    if (!competitors || competitors.length === 0) return null;
    return (
      <div className="space-y-3">
        {competitors.map((comp: any, idx: number) => {
          const headings = parseHeadingsToHierarchy(comp.headers || '');
          return (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-2">#{comp.rank}</Badge>
                    <CardTitle className="text-sm">{comp.title}</CardTitle>
                    <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">
                      {comp.url}
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* メトリクス一列表示 */}
                <div className="flex items-center gap-6 text-sm border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">文字数:</span>
                    <span className="font-semibold">{comp.word_count?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">コンテンツスコア:</span>
                    <span className="font-semibold">{comp.content_score}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">可読性:</span>
                    <span className="font-semibold">{comp.readability}</span>
                  </div>
                </div>

                {/* 見出し階層表示 */}
                {headings.length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">見出し構成 ({headings.length}件)</p>
                    <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-muted/30">
                      {headings.map((h, hIdx) => {
                        const indent = parseInt(h.level.replace('h', '')) - 1;
                        return (
                          <div
                            key={hIdx}
                            className="text-sm py-0.5"
                            style={{ paddingLeft: `${indent * 16}px` }}
                          >
                            <span className="text-primary font-mono text-xs mr-2">{h.level}</span>
                            <span>{h.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">見出し数</p>
                    <p className="text-sm font-semibold">{comp.headers || 'データなし'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderQuestions = (questions: any, title: string) => {
    if (!questions || questions.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {title}
        </h4>
        <ul className="space-y-2">
          {questions.map((q: any, idx: number) => {
            // Handle both string and object formats
            const questionText = typeof q === 'string' ? q : (q.q || q.question || JSON.stringify(q));
            return (
              <li key={idx} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/50">
                <span className="text-primary font-semibold mt-0.5">Q.</span>
                <span>{questionText}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  if (queryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
        <div className="container max-w-6xl">
          <p className="text-gray-600">クエリ詳細を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
        <div className="container max-w-6xl">
          <p className="text-red-600">クエリが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
      <div className="container max-w-6xl">
        <Link href="/queries">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            クエリ一覧に戻る
          </Button>
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-900 mb-2">{query.keyword}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>ステータス： <Badge variant={query.status === "ready" ? "default" : "secondary"}>{query.status}</Badge></span>
            <span>作成日： {new Date(query.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
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
                        SEO最適化分析データ - {new Date(query.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
                      <Download className="mr-2 h-4 w-4" />
                      JSONダウンロード
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {/* 基本情報 */}
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
                            <div><span className="font-medium">参照ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{project?.neuronProjectId || '-'}</code></div>
                            <div><span className="font-medium">分析ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{query?.neuronQueryId || '-'}</code></div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* SERP分析 */}
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

                      {/* 指標 */}
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

                      {/* キーワード */}
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

                      {/* アイデア */}
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
                              {recommendations.ideas.topic_matrix && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    トピックマトリックス
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {Array.isArray(recommendations.ideas.topic_matrix) ? (
                                      recommendations.ideas.topic_matrix.map((topic: any, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-sm py-1">
                                          {typeof topic === 'string' ? topic : JSON.stringify(topic)}
                                        </Badge>
                                      ))
                                    ) : typeof recommendations.ideas.topic_matrix === 'object' ? (
                                      <div className="w-full grid gap-2">
                                        {Object.entries(recommendations.ideas.topic_matrix)
                                          .sort(([, a]: [string, any], [, b]: [string, any]) => (b.importance || 0) - (a.importance || 0))
                                          .map(([question, data]: [string, any], idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white border shadow-sm">
                                              <div className="text-sm font-medium text-gray-800">{question}</div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">重要度</span>
                                                <Badge
                                                  variant={(data.importance || 0) >= 8 ? "default" : "secondary"}
                                                  className="w-8 h-8 flex items-center justify-center rounded-full p-0"
                                                >
                                                  {data.importance || 0}
                                                </Badge>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    ) : (
                                      <pre className="text-xs bg-muted p-2 rounded w-full overflow-x-auto">
                                        {JSON.stringify(recommendations.ideas.topic_matrix, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* 競合分析 */}
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

          <TabsContent value="editor" className="space-y-4">
            {/* タイトル作成 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      ① タイトル
                    </CardTitle>
                    <CardDescription>検索結果に表示されるページタイトルを作成</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-sm transition-all"
                      size="sm"
                      onClick={handleGenerateTitleDesc}
                      disabled={generateMutation.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {generateMutation.isPending ? "AI生成中..." : "タイトル・説明文をAI自動生成"}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">上位サイトを分析して提案</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">タイトルテキスト</label>
                    <span className={`text-sm ${title.length === 0 ? 'text-muted-foreground' :
                      title.length >= 30 && title.length <= 60 ? 'text-green-600 font-medium' :
                        'text-orange-600 font-medium'
                      }`}>
                      {title.length} / 60文字 (推奨: 30-60)
                    </span>
                  </div>
                  <Textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="min-h-[80px]"
                    placeholder={isAdmin ? "例: FX口座おすすめ比較ランキング【最新版】初心者向けに選び方も詳しく解説" : ""}
                  />
                </div>

                {/* 推奨キーワード (Admin Only) */}
                {isAdmin && recommendations?.terms?.title && recommendations.terms.title.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">推奨キーワード ({recommendations.terms.title.length}件) - クリックで挿入</p>
                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                      {recommendations.terms.title.map((term: any, idx: number) => {
                        const isUsed = title.toLowerCase().includes(term.t.toLowerCase());
                        return (
                          <Badge
                            key={idx}
                            variant={isUsed ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/80"
                            onClick={() => {
                              if (!title.includes(term.t)) {
                                setTitle(prev => prev ? `${prev} ${term.t}` : term.t);
                              }
                            }}
                          >
                            {term.t} <span className="ml-1 text-xs opacity-70">({term.usage_pc}%)</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ディスクリプション作成 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      ② ディスクリプション
                    </CardTitle>
                    <CardDescription>検索結果に表示されるページの説明文を作成</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-sm transition-all"
                      size="sm"
                      onClick={handleGenerateTitleDesc}
                      disabled={generateMutation.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {generateMutation.isPending ? "AI生成中..." : "タイトル・説明文をAI自動生成"}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">上位サイトを分析して提案</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">ディスクリプションテキスト</label>
                    <span className={`text-sm ${description.length === 0 ? 'text-muted-foreground' :
                      description.length >= 80 && description.length <= 160 ? 'text-green-600 font-medium' :
                        'text-orange-600 font-medium'
                      }`}>
                      {description.length} / 160文字 (推奨: 80-160)
                    </span>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px]"
                    placeholder={isAdmin ? "例: FX初心者におすすめのFX口座を比較しランキングにまとめました。トレードスタイルごとに比較したFX口座ランキングも公開しているため、自分に合ったFX口座を比較検討できます。" : ""}
                  />
                </div>

                {/* 推奨キーワード (Admin Only) */}
                {isAdmin && recommendations?.terms?.desc && recommendations.terms.desc.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">推奨キーワード ({recommendations.terms.desc.length}件) - クリックで挿入</p>
                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                      {recommendations.terms.desc.map((term: any, idx: number) => {
                        const isUsed = description.toLowerCase().includes(term.t.toLowerCase());
                        return (
                          <Badge
                            key={idx}
                            variant={isUsed ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/80"
                            onClick={() => {
                              if (!description.includes(term.t)) {
                                setDescription(prev => prev ? `${prev} ${term.t}` : term.t);
                              }
                            }}
                          >
                            {term.t} <span className="ml-1 text-xs opacity-70">({term.usage_pc}%)</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google検索結果プレビュー */}
            {(title || description) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Google検索結果プレビュー
                  </CardTitle>
                  <CardDescription>実際の検索結果での表示イメージ</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {query?.keyword?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-1">yourdomain.com › category › post</div>
                        <h3 className="text-blue-600 text-xl hover:underline cursor-pointer mb-1">
                          {title || "タイトルを入力してください"}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {description || "ディスクリプションを入力してください"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* 保存ボタン */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleSaveTitleDesc}
                      disabled={saveTitleDescMutation.isPending || (!title && !description)}
                      variant={isTitleDescDirty ? "default" : "outline"}
                      className={isTitleDescDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all" : ""}
                    >
                      {saveTitleDescMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : isTitleDescDirty ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          変更を保存（未保存）
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
            )}

            {/* リード文（導入文） */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      ③ リード文
                    </CardTitle>
                    <CardDescription>記事の導入部分を作成（読者の興味を引きつける文章）</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-sm transition-all"
                      size="sm"
                      onClick={handleGenerateLeadText}
                      disabled={isGeneratingLeadText || generateLeadTextMutation.isPending || !title || !description}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isGeneratingLeadText ? "AI生成中..." : "リード文をAI自動生成"}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">タイトルを元に導入文を作成</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGeneratingLeadText ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>リード文を生成中...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">リード文テキスト</label>
                        <span className={`text-sm ${leadText.length === 0 ? 'text-muted-foreground' :
                          leadText.length < 200 ? 'text-yellow-600' :
                            leadText.length <= 400 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {leadText.length} / 400文字 (推奨: 200-400)
                        </span>
                      </div>
                      <Textarea
                        placeholder={isAdmin ? "例: FX口座選びで失敗したくない方へ。この記事では、主要なFX会社を役底比較し、初心者の方におすすめの口座をランキング形式で紹介します..." : ""}
                        value={leadText}
                        onChange={(e) => setLeadText(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    {/* 推奨キーワード（本文用） (Admin Only) */}
                    {isAdmin && recommendations?.terms?.h && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">推奨キーワード ({recommendations.terms.h.length}件) - クリックで挿入</label>
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                          {recommendations.terms.h.map((term: any, index: number) => {
                            const isUsed = leadText.toLowerCase().includes(term.t.toLowerCase());
                            return (
                              <Badge
                                key={index}
                                variant={isUsed ? "default" : "outline"}
                                className={`cursor-pointer transition-colors ${isUsed ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-primary/10'
                                  }`}
                                onClick={() => {
                                  if (!isUsed) {
                                    setLeadText(prev => prev + (prev ? ' ' : '') + term.t);
                                  }
                                }}
                              >
                                {term.t} ({term.avgTopTen || 0}%)
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 保存ボタン */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleSaveLeadText}
                        disabled={saveLeadTextMutation.isPending || !leadText}
                        variant={isLeadTextDirty ? "default" : "outline"}
                        className={isLeadTextDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all" : ""}
                      >
                        {saveLeadTextMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            保存中...
                          </>
                        ) : isLeadTextDirty ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            変更を保存（未保存）
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            保存済み
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 目次構成 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      ④ 目次構成
                    </CardTitle>
                    <CardDescription>SEO最適化された記事の目次を作成</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-sm transition-all"
                      size="sm"
                      onClick={handleGenerateOutline}
                      disabled={isGeneratingOutline || generateOutlineMutation.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isGeneratingOutline ? "AI生成中..." : "目次構成をAI自動生成"}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">上位サイトの構造を分析して提案</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGeneratingOutline ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-lg font-medium mb-1">目次をAI生成中...</p>
                    <p className="text-sm">上位サイトの構造を分析しています。</p>
                    <p className="text-sm">これには数分かかる場合があります。</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/30 p-3 rounded-md mb-4 text-xs text-muted-foreground border border-border/50">
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <span className="flex items-center gap-1.5"><span className="bg-background border rounded px-1 min-w-[20px] text-center">✋</span> ドラッグで移動</span>
                        <span className="flex items-center gap-1.5"><span className="bg-background border rounded px-1">H2/H3</span> で階層切替</span>
                        <span className="flex items-center gap-1.5"><span className="bg-background border rounded px-1 min-w-[20px] text-center">＋</span> で見出し追加</span>
                      </div>
                    </div>
                    <OutlineEditor
                      headings={outlineHeadings}
                      onChange={handleOutlineChange}
                      recommendedKeywords={recommendations?.terms?.h?.map((t: any) => t.t) || []}
                      onAutoSave={handleSaveOutline}
                      isDirty={isOutlineDirty}
                    />
                  </>
                )}

                {/* 目次保存ボタンのみ表示 */}
                {outlineHeadings.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleSaveOutline}
                      disabled={updateOutlineMutation.isPending || !outlines || outlines.length === 0}
                      variant={isOutlineDirty ? "default" : "outline"}
                      className={isOutlineDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all" : ""}
                    >
                      {updateOutlineMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : isOutlineDirty ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          変更を保存（未保存）
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          保存済み
                        </>
                      )}
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>



            {/* HTMLコンテンツ編集 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">⑤ 本文コンテンツ プレビュー</CardTitle>
                    <CardDescription>表示中の形式（HTML・Markdown・テキスト）でコピー可能</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === 'html' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('html')}
                      className="h-8"
                    >
                      <Code className="h-4 w-4 mr-2" />
                      HTML
                    </Button>
                    <Button
                      variant={viewMode === 'markdown' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('markdown')}
                      className="h-8"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Markdown
                    </Button>
                    <Button
                      variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('preview')}
                      className="h-8"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      プレビュー
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      const textToCopy = viewMode === 'markdown'
                        ? turndownService.turndown(htmlContent)
                        : (viewMode === 'preview' ? new DOMParser().parseFromString(htmlContent, 'text/html').body.innerText : htmlContent);
                      navigator.clipboard.writeText(textToCopy);
                      toast.success("クリップボードにコピーしました");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    コピー
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {viewMode === 'html' ? (
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder="<h1>Your content here...</h1>"
                  />
                ) : viewMode === 'markdown' ? (
                  <Textarea
                    readOnly
                    value={turndownService.turndown(htmlContent)}
                    className="min-h-[300px] font-mono text-sm bg-muted text-muted-foreground"
                  />
                ) : (
                  <div
                    className="min-h-[300px] p-6 border rounded-md prose prose-sm max-w-none dark:prose-invert bg-white dark:bg-zinc-950 prose-headings:font-bold [&_h2]:text-lg [&_h2]:bg-slate-100 [&_h2]:dark:bg-slate-800 [&_h2]:p-2 [&_h2]:rounded [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-0 [&_h2]:pb-2 [&_h3]:text-base [&_h3]:border-l-4 [&_h3]:border-blue-500 [&_h3]:pl-2 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                )}

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SEO評価</CardTitle>
                <CardDescription>コンテンツのSEOパフォーマンスを分析</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">コンテンツ編集タブで「SEO評価」をクリックして結果を表示します。</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 rounded-full w-12 h-12 shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white z-50"
          size="icon"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
