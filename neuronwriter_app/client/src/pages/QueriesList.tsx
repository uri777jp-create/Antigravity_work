import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, FileText, Clock, CheckCircle2, XCircle, LayoutList } from "lucide-react";
import { Link } from "wouter";

export default function QueriesList() {
  const { user } = useAuth();
  const { data: queries, isLoading } = trpc.neuronwriter.getUserQueries.useQuery(undefined, {
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary/5">
      <div className="container py-16 px-4 md:px-8 max-w-5xl mx-auto">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-primary pl-0 hover:bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ダッシュボード
          </Button>
        </Link>

        <div className="relative mb-10 border-b pb-8">
          <div className="absolute top-0 right-0 -mt-4 opacity-10 pointer-events-none">
            <LayoutList className="w-32 h-32 text-blue-500" />
          </div>

          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-50 p-3 text-blue-600">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-gray-900">
              作成済みリスト
            </h1>
            <p className="text-muted-foreground text-lg">
              過去に作成した構成案の確認、編集、ステータス管理を行います。
            </p>
          </div>
        </div>

        {queries && queries.length > 0 ? (
          <div className="grid gap-4">
            {queries.map((query) => (
              <Link key={query.id} href={`/query/${query.id}`}>
                <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{query.keyword}</CardTitle>
                        <CardDescription className="flex items-center gap-4">
                          <span>作成日時：{new Date(query.createdAt).toLocaleString()}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(query.status)}
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(query.status)}`}
                        >
                          {query.status}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-primary/20">
            <CardContent className="py-16">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">まだクエリがありません</h3>
                <p className="text-muted-foreground mb-6">
                  最初のクエリを作成してSEOコンテンツ生成を開始
                </p>
                <Link href="/new-query">
                  <Button size="lg">新しいクエリを作成</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
