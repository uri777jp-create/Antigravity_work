import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";

interface SEOScoreCircleProps {
  currentScore: number;
  targetScore: number;
  size?: number;
  strokeWidth?: number;
}

export function SEOScoreCircle({
  currentScore,
  targetScore,
  size = 160,
  strokeWidth = 12,
}: SEOScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(currentScore, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  // スコアに応じた色を決定
  const getScoreColor = (score: number) => {
    if (score >= 70) return "#10b981"; // 緑
    if (score >= 40) return "#f59e0b"; // オレンジ
    return "#ef4444"; // 赤
  };

  const scoreColor = useMemo(() => getScoreColor(currentScore), [currentScore]);

  return (
    <Card className="w-fit">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* 円形プログレスバー */}
          <div className="relative" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              className="transform -rotate-90"
            >
              {/* 背景の円 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* プログレスの円 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={scoreColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
              />
            </svg>
            
            {/* 中央のスコア表示 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground">
                {Math.round(currentScore)}
              </span>
              <span className="text-sm text-muted-foreground mt-1">
                / 100
              </span>
            </div>

            {/* 目標スコア（右上） */}
            <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-primary/10 rounded-full px-3 py-1 border border-primary/20">
              <Target className="w-3 h-3 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {Math.round(targetScore)}
              </span>
            </div>
          </div>

          {/* スコア評価テキスト */}
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {currentScore >= 70 && "優秀なSEOスコアです！"}
              {currentScore >= 40 && currentScore < 70 && "改善の余地があります"}
              {currentScore < 40 && "最適化が必要です"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
