import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, FileText, BarChart3, Zap, ShieldCheck, RefreshCw, Link2, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    // ログアウト後はトップページ（未ログイン状態）を再表示するか、ログインページへ
    setLocation("/");
  };

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
        <div className="container py-6 flex justify-end gap-4">
          <Link href="/dashboard">
            <Button variant="outline">ダッシュボードへ</Button>
          </Link>
          <Button variant="ghost" onClick={handleLogout}>ログアウト</Button>
        </div>
        <div className="container py-10">
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed w-full bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Lumina</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">ログイン</Button>
            </Link>
            <Link href="/login">
              <Button className="font-medium shadow-lg hover:shadow-primary/20 transition-all">
                無料で始める
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-32 pb-20 overflow-hidden">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">次世代 AI ファクトチェック & リライトエンジン</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              信頼できるコンテンツを、<br />
              <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">AIと検索の力で。</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Web検索と連動したファクトチェック、情報ソースの自動リンク、そして文脈を理解したAIリライト。
              SEO記事作成の常識が変わります。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all group">
                  今すぐ体験する
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-2">
                  機能を見る
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div id="features" className="py-24 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">なぜ Lumina なのか？</h2>
            <p className="text-slate-600 text-lg">プロのライターのために設計された、次世代のコンテンツ作成プラットフォーム</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">高精度ファクトチェック</h3>
              <p className="text-slate-600 leading-relaxed">
                リアルタイムのWeb検索技術を活用。AIの記述内容を最新の事実情報に基づいて検証し、ハルシネーションを防ぎます。
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">修正案の自動提案</h3>
              <p className="text-slate-600 leading-relaxed">
                間違いを指摘するだけではありません。正確な情報に基づいた「修正案」をAIが提示し、ワンクリックで反映できます。
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform">
                <Link2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">参照元の透明性</h3>
              <p className="text-slate-600 leading-relaxed">
                記事内の主張には自動的にソースリンク（Source 1, 2...）が付与されます。読者が情報の出所をすぐに確認できます。
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-6 text-amber-600 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">専用ワークスペース</h3>
              <p className="text-slate-600 leading-relaxed">
                ユーザーごとに独立したプロジェクト環境を自動構築。他のユーザーと混ざることなく、あなただけのSEOコンテンツ制作に集中できます。
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-2xl font-bold text-white tracking-tight">Lumina</span>
              <p className="text-sm mt-2 text-slate-500">AI-Powered SEO Content Platform</p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
              <a href="#" className="hover:text-white transition-colors">利用規約</a>
              <a href="#" className="hover:text-white transition-colors">お問い合わせ</a>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-600">
            &copy; 2026 Lumina. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
