import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OutlineHeading {
  id: string;
  level: 2 | 3;
  text: string;
  keywords: string[];
  order: number;
}

interface OutlineEditorProps {
  headings: OutlineHeading[];
  onChange: (headings: OutlineHeading[]) => void;
  recommendedKeywords?: string[];
}

export function OutlineEditor({ headings, onChange, recommendedKeywords = [] }: OutlineEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

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
          {headings.map((heading, index) => (
            <div
              key={heading.id}
              draggable
              onDragStart={() => handleDragStart(heading.id)}
              onDragOver={(e) => handleDragOver(e, heading.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group relative border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors cursor-move",
                draggedId === heading.id && "opacity-50"
              )}
            >
              <div className="flex items-start gap-3">
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

                {/* 見出しテキスト入力 */}
                <div className="flex-1 space-y-2">
                  <Input
                    value={heading.text}
                    onChange={(e) => handleTextChange(heading.id, e.target.value)}
                    placeholder={heading.level === 2 ? "H2見出しを入力..." : "H3小見出しを入力..."}
                    className={cn(
                      "font-medium",
                      heading.level === 2 ? "text-lg" : "text-base"
                    )}
                  />

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
                    <div className="flex flex-wrap gap-1 mt-2 max-h-[100px] overflow-y-auto">
                      <span className="text-xs text-muted-foreground mr-2">推奨キーワード ({recommendedKeywords.length}件):</span>
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

              {/* 見出し追加ボタン（ホバー時表示） */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(heading.id)}
                  className="h-6 px-2 text-xs shadow-md"
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
