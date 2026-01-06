import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ダッシュボードに戻る
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            全てのクエリ
          </h1>
          <p className="text-muted-foreground text-lg">
            コンテンツクエリを表示・管理
          </p>
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
                          <span>言語： {query.language.toUpperCase()}</span>
                          <span>エンジン： {query.searchEngine}</span>
                          <span>{new Date(query.createdAt).toLocaleDateString()}</span>
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
