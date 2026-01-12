import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, FileText, LogOut, Sparkles, LayoutList, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary/5">
      <div className="container py-16 px-4 md:px-8 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-gray-900">
              おかえりなさい、<span className="text-primary">{user?.name || "ユーザー"}</span> さん
            </h1>
            <p className="text-muted-foreground text-lg">
              AIを活用して、高品質なSEO記事構成を素早く作成・管理しましょう。
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-primary">
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>

        {/* Action Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">

          {/* Create New Query Card */}
          <Link href="/new-query">
            <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24 text-primary" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <Plus className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-gray-900">新しい記事を作る</h3>
                  <p className="text-muted-foreground mb-6">
                    キーワードを入力して、AIによる詳細な記事構成案を新規作成します。
                  </p>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 text-lg py-6 shadow-md group-hover:translate-y-[-2px] transition-transform">
                  作成を開始する
                </Button>
              </div>
            </div>
          </Link>

          {/* View Projects Card */}
          <Link href="/queries">
            <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <LayoutList className="w-24 h-24 text-blue-500" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-50 p-3 text-blue-600">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-gray-900">作成済みリスト</h3>
                  <p className="text-muted-foreground mb-6">
                    過去に作成した構成案の確認、編集、ステータス管理を行います。
                  </p>
                </div>
                <Button variant="outline" className="w-full text-lg py-6 border-2 group-hover:bg-gray-50 group-hover:translate-y-[-2px] transition-transform">
                  一覧を見る
                </Button>
              </div>
            </div>
          </Link>

        </div>

        {/* Admin Section (Optional) */}
        {user?.role === 'admin' && (
          <div className="mt-12 pt-8 border-t border-dashed">
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">管理者メニュー</h4>
            <Link href="/admin">
              <div className="flex items-center p-4 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer max-w-md">
                <Settings className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <div className="font-semibold text-red-900">管理者ダッシュボード</div>
                  <div className="text-sm text-red-700/80">ユーザー管理とプロジェクト割り当て</div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
