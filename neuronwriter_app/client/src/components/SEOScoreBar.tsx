import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp } from "lucide-react";

interface SEOScoreBarProps {
  currentScore: number;
  targetScore: number;
  wordCount?: number;
  keywordUsage?: number;
}

export function SEOScoreBar({
  currentScore = 0,
  targetScore = 0,
  wordCount = 0,
  keywordUsage = 0,
}: SEOScoreBarProps) {
  // NaN防止: 数値が不正な場合は0にする
  const safeCurrentScore = isNaN(currentScore) || currentScore === null ? 0 : currentScore;
  const safeTargetScore = isNaN(targetScore) || targetScore === null ? 0 : targetScore;
  const safeWordCount = isNaN(wordCount) || wordCount === null ? 0 : wordCount;
  const safeKeywordUsage = isNaN(keywordUsage) || keywordUsage === null ? 0 : keywordUsage;
  
  const progress = Math.min(Math.max(safeCurrentScore, 0), 100);

  // スコアに応じた色とグラデーションを決定
  const getScoreStyle = (score: number) => {
    if (score >= 70) {
      return {
        bg: "bg-gradient-to-r from-emerald-50 to-green-50",
        border: "border-emerald-200",
        gradient: "from-emerald-400 to-green-500",
        text: "text-emerald-700",
        label: "優秀",
      };
    }
    if (score >= 40) {
      return {
        bg: "bg-gradient-to-r from-amber-50 to-orange-50",
        border: "border-amber-200",
        gradient: "from-amber-400 to-orange-500",
        text: "text-amber-700",
        label: "改善可能",
      };
    }
    return {
      bg: "bg-gradient-to-r from-red-50 to-rose-50",
      border: "border-red-200",
      gradient: "from-red-400 to-rose-500",
      text: "text-red-700",
      label: "要改善",
    };
  };

  const scoreStyle = useMemo(() => getScoreStyle(safeCurrentScore), [safeCurrentScore]);

  return (
    <Card className={`${scoreStyle.bg} ${scoreStyle.border} border-2 transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* 左側: 現在スコア */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-bold ${scoreStyle.text}`}>
                {Math.round(safeCurrentScore)}
              </span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <span className={`text-xs font-semibold mt-1 ${scoreStyle.text}`}>
              {scoreStyle.label}
            </span>
          </div>

          {/* 中央: プログレスバー */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">SEOスコア</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                {safeWordCount > 0 && (
                  <span className="text-xs">{safeWordCount}文字</span>
                )}
                {safeKeywordUsage > 0 && (
                  <span className="text-xs">キーワード使用率: {Math.round(safeKeywordUsage)}%</span>
                )}
              </div>
            </div>
            
            {/* プログレスバー */}
            <div className="relative h-8 bg-white/50 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full bg-gradient-to-r ${scoreStyle.gradient} transition-all duration-500 ease-out rounded-full shadow-lg`}
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
              
              {/* 目標スコアのマーカー */}
              {safeTargetScore > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-primary/60 transition-all duration-300"
                  style={{ left: `${Math.min(safeTargetScore, 100)}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md" />
                </div>
              )}
            </div>
          </div>

          {/* 右側: 目標スコア */}
          <div className="flex flex-col items-center justify-center min-w-[80px] gap-1">
            <div className="flex items-center gap-1 text-primary">
              <Target className="w-4 h-4" />
              <span className="text-2xl font-bold">{Math.round(safeTargetScore)}</span>
            </div>
            <span className="text-xs text-muted-foreground">目標</span>
          </div>
        </div>

        {/* スコア差分の表示 */}
        {safeTargetScore > 0 && (
          <div className="mt-3 pt-3 border-t border-white/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                目標まで: <span className="font-semibold">{Math.max(0, Math.round(safeTargetScore - safeCurrentScore))}ポイント</span>
              </span>
              {safeCurrentScore >= safeTargetScore && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-semibold">目標達成！</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
