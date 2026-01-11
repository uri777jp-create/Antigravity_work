import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, FileText, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: queries, isLoading: queriesLoading } = trpc.neuronwriter.getUserQueries.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: projects, isLoading: projectsLoading } = trpc.neuronwriter.getUserProjects.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (authLoading || queriesLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const readyQueries = queries?.filter((q) => q.status === "ready") || [];
  const pendingQueries = queries?.filter((q) => q.status === "pending") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            SEO Content Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your Natural Language Processing Data content and SEO optimization
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{projects?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{readyQueries.length}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingQueries.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Create and manage your SEO content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/new-query">
                <Button className="w-full justify-start" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Query
                </Button>
              </Link>
              <Link href="/queries">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FileText className="w-4 h-4 mr-2" />
                  View All Queries
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="secondary" className="w-full justify-start text-red-700 bg-red-50 hover:bg-red-100" size="lg">
                    管理者ダッシュボード
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest queries and content</CardDescription>
            </CardHeader>
            <CardContent>
              {queries && queries.length > 0 ? (
                <div className="space-y-3">
                  {queries.slice(0, 5).map((query) => (
                    <Link key={query.id} href={`/query/${query.id}`}>
                      <div className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate">{query.keyword}</div>
                          <div
                            className={`text-xs px-2 py-1 rounded-full ${query.status === "ready"
                                ? "bg-green-100 text-green-700"
                                : query.status === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                          >
                            {query.status}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(query.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No queries yet. Create your first query to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
