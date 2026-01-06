import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Plus, Trash2, Sparkles, BookOpen, Loader2 } from "lucide-react";
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
}

interface OutlineEditorProps {
  headings: OutlineHeading[];
  onChange: (headings: OutlineHeading[]) => void;
  recommendedKeywords?: string[];
}

export function OutlineEditor({ headings, onChange, recommendedKeywords = [] }: OutlineEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null); // 現在執筆中のID
  const [expandedId, setExpandedId] = useState<string | null>(null); // 本文表示中のID

  const writeSectionMutation = trpc.neuronwriter.writeSectionWithSearch.useMutation({
    onSuccess: () => {
      toast.success("記事セクションを生成しました");
    },
    onError: (error) => {
      toast.error(`生成エラー: ${error.message}`);
      setWritingId(null);
    }
  });

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
        setExpandedId(heading.id);
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
    }).then((result) => {
      const updated = headings.map((h) =>
        h.id === heading.id ? { ...h, content: result.content, references: result.references } : h
      );
      onChange(updated);
      setExpandedId(heading.id);
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
                expandedId === heading.id ? "ring-2 ring-primary/20" : "hover:bg-accent/50"
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
                    {(heading.level === 2 || heading.content || heading.level === 3) && ( // H3のボタン表示制御: 一旦非表示にしたいが、既存コンテンツがある場合は表示
                      <Button
                        variant={heading.content ? "default" : "outline"}
                        size="sm"
                        onClick={() => heading.content ? setExpandedId(expandedId === heading.id ? null : heading.id) : handleWrite(heading)}
                        disabled={writingId === heading.id}
                        className={cn(
                          "whitespace-nowrap",
                          heading.content && "bg-green-600 hover:bg-green-700",
                          heading.level === 3 && !heading.content && "hidden" // コンテンツがないH3はWeb執筆ボタンを隠す
                        )}
                      >
                        {writingId === heading.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            執筆中...
                          </>
                        ) : heading.content ? (
                          <>
                            <BookOpen className="h-4 w-4 mr-2" />
                            本文を確認
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                            Web執筆
                          </>
                        )}
                      </Button>
                    )}
                  </div>

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

              {/* 本文エディタエリア (展開時) */}
              {expandedId === heading.id && (
                <div className="px-4 pb-4 pl-12 fade-in-section">
                  <div className="relative">
                    <Textarea
                      value={heading.content || ""}
                      onChange={(e) => handleContentChange(heading.id, e.target.value)}
                      className="min-h-[200px] font-mono text-sm bg-muted/30"
                      placeholder="ここにこのセクションの本文が生成されます。手動で編集も可能です。"
                    />
                    {heading.references && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                        <p className="font-semibold mb-1">参照元:</p>
                        <pre className="whitespace-pre-wrap">{heading.references}</pre>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleWrite(heading)}
                      disabled={writingId === heading.id}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      再生成（上書き）
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setExpandedId(null)}>
                      閉じる
                    </Button>
                  </div>
                </div>
              )}

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
