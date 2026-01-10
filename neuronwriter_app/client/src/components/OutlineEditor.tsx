import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripVertical, Plus, Trash2, Sparkles, BookOpen, Loader2, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface OutlineHeading {
  id: string;
  level: 2 | 3;
  text: string;
  keywords: string[];
  order: number;
  content?: string;     // 生成された本文
  references?: string;  // 参照元
  factCheckResults?: {
    claim: string;
    status: "verified" | "contradicted" | "unverified" | "partially_verified";
    reason: string;
    thought?: string;
    confidence?: number;
    sourceUrl?: string;
    suggestion?: string;
  }[];
  factCheckSources?: { id: number; title: string; url: string }[];
}

interface OutlineEditorProps {
  headings: OutlineHeading[];
  onChange: (headings: OutlineHeading[]) => void;
  recommendedKeywords?: string[];
  onAutoSave?: (headings: OutlineHeading[]) => void;
}

export function OutlineEditor({ headings, onChange, recommendedKeywords = [], onAutoSave }: OutlineEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null); // 現在執筆中のID
  const [checkingId, setCheckingId] = useState<string | null>(null); // ファクトチェック中のID

  // Helper to render text with source links
  const renderTextWithSources = (text: string, sources?: { id: number; url: string }[]) => {
    if (!text || !sources) return text;

    // Split by pattern "Source X" or "ソースX" or "出典X"
    const parts = text.split(/(Source\s*\d+|ソース\s*\d+|出典\s*\d+)/gi);

    return parts.map((part, i) => {
      const match = part.match(/(?:Source|ソース|出典)\s*(\d+)/i);
      if (match) {
        const sourceId = parseInt(match[1]);
        const source = sources.find(s => s.id === sourceId);
        if (source) {
          return (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5"
              title={source.url}
            >
              {part}
              <BookOpen className="h-3 w-3" />
            </a>
          );
        }
      }
      return part;
    });
  };

  const writeSectionMutation = trpc.neuronwriter.writeSectionWithSearch.useMutation({
    onSuccess: () => {
      toast.success("記事セクションを生成しました");
    },
    onError: (error) => {
      toast.error(`生成エラー: ${error.message}`);
      setWritingId(null);
    }
  });

  const factCheckMutation = trpc.neuronwriter.factCheckSection.useMutation({
    onSuccess: () => {
      toast.success("ファクトチェックが完了しました");
    },
    onError: (error) => {
      toast.error(`検証エラー: ${error.message}`);
      setCheckingId(null);
    }
  });

  const handleFactCheck = (heading: OutlineHeading) => {
    if (!heading.content) return;
    setCheckingId(heading.id);
    factCheckMutation.mutateAsync({
      heading: heading.text,
      content: heading.content
    }).then((res) => {
      const updated = headings.map((h) =>
        h.id === heading.id ? { ...h, factCheckResults: res.results, factCheckSources: res.sources } : h
      );
      onChange(updated);
      setCheckingId(null);

      // オートセーブ実行
      if (onAutoSave) {
        onAutoSave(updated);
      }
    }).catch(() => setCheckingId(null));
  };

  const writeChapterMutation = trpc.neuronwriter.writeChapterWithSearch.useMutation({
    onSuccess: () => {
      toast.success("章全体の執筆が完了しました");
    },
    onError: (error) => {
      toast.error(`執筆エラー: ${error.message}`);
      setWritingId(null);
    }
  });

  const handleWrite = (heading: OutlineHeading) => {
    if (!heading.text) {
      toast.error("見出しを入力してください");
      return;
    }

    // H3の場合は個別生成（もしボタンが表示された場合）
    if (heading.level === 3) {
      setWritingId(heading.id);
      writeSectionMutation.mutateAsync({
        heading: heading.text,
        keywords: heading.keywords,
      }).then((result) => {
        const updated = headings.map((h) =>
          h.id === heading.id ? { ...h, content: result.content, references: result.references } : h
        );
        onChange(updated);

        setWritingId(null);
      }).catch(() => {
        setWritingId(null);
      });
      return;
    }

    // H2の場合は章一括生成
    // H2とそれに続くH3を取得
    const h2Index = headings.findIndex(h => h.id === heading.id);
    const h3s: { heading: string; keywords: string[] }[] = [];

    for (let i = h2Index + 1; i < headings.length; i++) {
      if (headings[i].level === 2) break; // 次のH2が来たら終了
      h3s.push({
        heading: headings[i].text,
        keywords: headings[i].keywords || []
      });
    }

    setWritingId(heading.id);
    writeChapterMutation.mutateAsync({
      h2: {
        heading: heading.text,
        keywords: heading.keywords
      },
      h3s: h3s
    }).then((result: any) => {
      // H2のコンテンツ更新
      let updated = headings.map((h) =>
        h.id === heading.id ? { ...h, content: result.content } : h
      );

      // H3のコンテンツ更新
      if (result.h3Contents && Array.isArray(result.h3Contents)) {
        result.h3Contents.forEach((h3Data: any) => {
          // テキストとレベルが一致するH3を探して更新
          // 注意: 同じテキストのH3が複数あると両方更新されるが、通常はユニークか、順番で判断すべきだが簡易的にテキストマッチ
          updated = updated.map(h =>
            h.level === 3 && h.text === h3Data.heading ? { ...h, content: h3Data.content } : h
          );
        });
      }

      onChange(updated);
      setWritingId(null);
    }).catch(() => setWritingId(null));
  };

  const handleContentChange = (id: string, newContent: string) => {
    const updated = headings.map((h) => (h.id === id ? { ...h, content: newContent } : h));
    onChange(updated);
  };

  const handleTextChange = (id: string, newText: string) => {
    const updated = headings.map((h) => (h.id === id ? { ...h, text: newText } : h));
    onChange(updated);
  };

  const handleLevelToggle = (id: string) => {
    const updated = headings.map((h) => {
      if (h.id === id) {
        return { ...h, level: h.level === 2 ? 3 : 2 } as OutlineHeading;
      }
      return h;
    });
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    const updated = headings.filter((h) => h.id !== id);
    onChange(updated);
  };

  const handleAdd = (afterId?: string) => {
    const newHeading: OutlineHeading = {
      id: `h${Date.now()}`,
      level: 2,
      text: "",
      keywords: [],
      order: headings.length,
    };

    if (afterId) {
      const index = headings.findIndex((h) => h.id === afterId);
      const updated = [
        ...headings.slice(0, index + 1),
        newHeading,
        ...headings.slice(index + 1),
      ];
      onChange(updated);
    } else {
      onChange([...headings, newHeading]);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = headings.findIndex((h) => h.id === draggedId);
    const targetIndex = headings.findIndex((h) => h.id === targetId);

    const updated = [...headings];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    onChange(updated);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const insertKeyword = (headingId: string, keyword: string) => {
    const updated = headings.map((h) => {
      if (h.id === headingId) {
        const newText = h.text ? `${h.text} ${keyword}` : keyword;
        const newKeywords = h.keywords.includes(keyword) ? h.keywords : [...h.keywords, keyword];
        return { ...h, text: newText, keywords: newKeywords };
      }
      return h;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {headings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>目次がまだ生成されていません。</p>
            <p className="text-sm mt-2">「AI生成」ボタンをクリックして目次を作成してください。</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {headings.map((heading) => (
            <div
              key={heading.id}
              className={cn(
                "group relative border rounded-lg bg-card transition-all",
                draggedId === heading.id && "opacity-50",
                "hover:bg-accent/50"
              )}
            >
              {/* ヘッダー部分 */}
              <div
                className="p-4 flex items-start gap-3 cursor-move"
                draggable
                onDragStart={() => handleDragStart(heading.id)}
                onDragOver={(e) => handleDragOver(e, heading.id)}
                onDragEnd={handleDragEnd}
              >
                {/* ドラッグハンドル */}
                <div className="mt-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* レベルインジケーター */}
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLevelToggle(heading.id)}
                    className="h-8 px-2"
                  >
                    {heading.level === 2 ? (
                      <span className="font-bold text-lg">H2</span>
                    ) : (
                      <span className="font-medium text-sm text-muted-foreground">H3</span>
                    )}
                  </Button>
                </div>

                {/* メイン入力エリア */}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={heading.text}
                      onChange={(e) => handleTextChange(heading.id, e.target.value)}
                      placeholder={heading.level === 2 ? "H2見出しを入力..." : "H3小見出しを入力..."}
                      className={cn(
                        "font-medium flex-1",
                        heading.level === 2 ? "text-lg" : "text-base"
                      )}
                    />

                    {/* 執筆ボタン（H2のみ、または既にコンテンツがあるH3） */}
                    {(heading.level === 2 || heading.content || heading.level === 3) && (
                      <Button
                        variant={heading.content ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleWrite(heading)}
                        disabled={writingId === heading.id}
                        className={cn(
                          "whitespace-nowrap",
                          heading.level === 3 && !heading.content && "hidden" // コンテンツがないH3はWeb執筆ボタンを隠す（H2から一括生成するため）
                        )}
                      >
                        {writingId === heading.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            執筆中...
                          </>
                        ) : (
                          <>
                            <Sparkles className={cn("h-4 w-4 mr-2", heading.content ? "text-primary" : "text-yellow-500")} />
                            {heading.content ? "AI再生成" : "Web執筆"}
                          </>
                        )}
                      </Button>
                    )}
                    {/* Fact Check Button */}
                    {heading.content && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFactCheck(heading)}
                        disabled={checkingId === heading.id}
                        className="whitespace-nowrap ml-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        {checkingId === heading.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            検証中...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            ファクトチェック
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Fact Check Results */}
                  {heading.factCheckResults && (
                    <div className="mt-3 border rounded-md p-3 bg-white">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm">ファクトチェック結果</span>
                      </div>
                      {heading.factCheckResults.length === 0 ? (
                        <p className="text-sm text-muted-foreground">検証に必要な具体的な主張が見つかりませんでした。</p>
                      ) : (
                        <div className="space-y-3">
                          {heading.factCheckResults.map((res: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {res.status === "verified" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : res.status === "contradicted" ? (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  ) : res.status === "partially_verified" ? (
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-foreground/90">{res.claim}</p>
                                  <div className="mt-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={
                                        res.status === "verified" ? "default" :
                                          res.status === "contradicted" ? "destructive" :
                                            res.status === "partially_verified" ? "secondary" : "outline"
                                      } className={cn(
                                        "text-[10px] px-1 py-0 h-5",
                                        res.status === "verified" && "bg-green-600 hover:bg-green-700",
                                        res.status === "partially_verified" && "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                      )}>
                                        {res.status === "verified" ? "正確" :
                                          res.status === "contradicted" ? "誤り/矛盾" :
                                            res.status === "partially_verified" ? "一部正確/要補足" : "検証不能"}
                                      </Badge>
                                      {res.confidence !== undefined && (
                                        <span className="text-xs text-muted-foreground">自信度: {res.confidence}%</span>
                                      )}
                                    </div>

                                    {res.thought && (
                                      <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground mb-1">
                                        <span className="font-semibold block mb-0.5">思考プロセス:</span>
                                        {renderTextWithSources(res.thought, heading.factCheckSources)}
                                      </div>
                                    )}

                                    <p className={cn(
                                      "text-xs",
                                      res.status === "verified" ? "text-green-700" :
                                        res.status === "contradicted" ? "text-red-700" :
                                          res.status === "partially_verified" ? "text-amber-800" : "text-gray-600"
                                    )}>
                                      <span className="font-semibold">判定理由:</span> {renderTextWithSources(res.reason, heading.factCheckSources)}
                                    </p>

                                    {/* Suggestion for contradictions */}
                                    {res.suggestion && (res.status === "contradicted" || res.status === "partially_verified") && (
                                      <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
                                        <div className="flex items-center gap-1 text-green-700 mb-1">
                                          <Sparkles className="h-3 w-3" />
                                          <span className="text-xs font-bold">修正案</span>
                                        </div>
                                        <p className="text-xs text-green-800">{res.suggestion}</p>
                                      </div>
                                    )}

                                    {res.sourceUrl && (
                                      <a href={res.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 mt-1">
                                        <BookOpen className="h-3 w-3" /> 出典を確認
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Source List Footer */}
                      {heading.factCheckSources && heading.factCheckSources.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">使用したソース一覧:</p>
                          <ul className="space-y-1">
                            {heading.factCheckSources.map((source) => (
                              <li key={source.id} className="text-xs">
                                <span className="font-mono text-muted-foreground mr-1">[Source {source.id}]</span>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate inline-block max-w-[90%] align-bottom"
                                >
                                  {source.title || source.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* キーワードバッジ */}
                  {heading.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {heading.keywords.map((kw, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 推奨キーワード挿入 */}
                  {recommendedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 max-h-[100px] overflow-y-auto hidden group-focus-within:flex">
                      <span className="text-xs text-muted-foreground mr-2">推奨キーワード:</span>
                      {recommendedKeywords.map((kw, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => insertKeyword(heading.id, kw)}
                        >
                          + {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 削除ボタン */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(heading.id)}
                  className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {/* 本文エディタエリア (常時表示) */}
              <div className="px-4 pb-4 pl-12">
                <Tabs defaultValue="preview" className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <TabsList className="grid w-[200px] grid-cols-2 h-8">
                      <TabsTrigger value="preview" className="text-xs">プレビュー</TabsTrigger>
                      <TabsTrigger value="edit" className="text-xs">HTML編集</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="preview" className="mt-0">
                    <div className="min-h-[150px] p-4 border rounded-md bg-white/50 text-sm overflow-hidden">
                      {heading.content ? (
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0.5"
                          dangerouslySetInnerHTML={{ __html: heading.content }}
                        />
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          コンテンツはまだ生成されていません
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="edit" className="mt-0">
                    <div className="relative">
                      <Textarea
                        value={heading.content || ""}
                        onChange={(e) => handleContentChange(heading.id, e.target.value)}
                        className="min-h-[150px] font-mono text-sm bg-muted/30"
                        placeholder="ここにこのセクションの本文が生成されます。手動で編集も可能です。"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* 見出し追加ボタン（ホバー時表示） */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(heading.id)}
                  className="h-6 px-2 text-xs shadow-md border"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  見出し追加
                </Button>
              </div>
            </div>
          ))}

          {/* 最後に見出し追加 */}
          <Button
            variant="outline"
            onClick={() => handleAdd()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            見出しを追加
          </Button>
        </>
      )}
    </div>
  );
}
