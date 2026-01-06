import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, FileText, BarChart3, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              おかえりなさい、{user.name || "ユーザー"}様！
            </h1>
            <p className="text-xl text-muted-foreground">
              素晴らしいSEOコンテンツを作成しましょう
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            <Link href="/new-query">
              <div className="group cursor-pointer">
                <div className="p-8 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary/50 hover:shadow-xl transition-all h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">クエリ作成</h3>
                  <p className="text-muted-foreground">
                    AI搭載の推薦機能で新しいSEOコンテンツクエリを開始
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/queries">
              <div className="group cursor-pointer">
                <div className="p-8 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary/50 hover:shadow-xl transition-all h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">クエリ一覧</h3>
                  <p className="text-muted-foreground">
                    全てのコンテンツクエリを一箇所で管理
                  </p>
                </div>
              </div>
            </Link>

            <div className="group cursor-pointer">
              <div className="p-8 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary/50 hover:shadow-xl transition-all h-full">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">分析</h3>
                <p className="text-muted-foreground">
                  SEOパフォーマンスとコンテンツインサイトを追跡
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">NeuronWriter API搭載</span>
            </div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              SEOコンテンツ管理
            </h1>
            <p className="text-2xl text-muted-foreground mb-8">
              AI搭載のインサイトでSEOコンテンツを作成・最適化・管理
            </p>
          </div>

          <div className="mb-12">
            {/* Direct link to mock login for reliability in dev mode */}
            <a href="/api/auth/mock-login" className="inline-block">
              <Button size="lg" className="text-lg px-8 py-6 h-auto">
                <Sparkles className="w-5 h-5 mr-2" />
                今すぐ始める (Dev)
              </Button>
            </a>
          </div>

          <div className="grid gap-8 md:grid-cols-3 mt-16">
            <div className="p-6 rounded-xl border border-primary/20 bg-card/50">
              <Sparkles className="w-10 h-10 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">AI搭載クエリ</h3>
              <p className="text-muted-foreground text-sm">
                キーワードに基づいてコンテンツ推薦を生成
              </p>
            </div>

            <div className="p-6 rounded-xl border border-primary/20 bg-card/50">
              <FileText className="w-10 h-10 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">コンテンツエディタ</h3>
              <p className="text-muted-foreground text-sm">
                バージョン管理機能付きでコンテンツを編集・保存
              </p>
            </div>

            <div className="p-6 rounded-xl border border-primary/20 bg-card/50">
              <BarChart3 className="w-10 h-10 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">SEO評価</h3>
              <p className="text-muted-foreground text-sm">
                検索エンジン向けにコンテンツを分析・最適化
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
