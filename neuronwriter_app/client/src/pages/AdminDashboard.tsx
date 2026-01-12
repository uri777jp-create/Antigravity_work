import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();

    // Redirect if not admin (client-side check, server also checks)
    if (user && user.role !== 'admin') {
        setLocation("/dashboard");
        return null;
    }

    const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();
    const { data: neuronProjects } = trpc.neuronwriter.listProjects.useQuery();
    const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
    const [projectId, setProjectId] = useState("");
    const [projectName, setProjectName] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const assignMutation = trpc.admin.assignProject.useMutation({
        onSuccess: () => {
            toast.success("プロジェクトを割り当てました");
            setIsOpen(false);
            setProjectId("");
            setProjectName("");
            refetch();
        },
        onError: (e: any) => {
            toast.error(`割り当て失敗: ${e.message}`);
        }
    });

    const handleAssign = () => {
        if (!selectedUser || !projectId || !projectName) return;

        assignMutation.mutate({
            targetUserId: selectedUser.id,
            neuronProjectId: projectId,
            projectName: projectName
        });
    };

    const handleProjectSelect = (value: string) => {
        const project = neuronProjects?.projects?.find((p: any) => p.id === value);
        if (project) {
            setProjectId(project.id);
            setProjectName(project.name || project.id);
        }
    };

    const filteredUsers = users?.filter((u: any) => u.name !== 'admin_sarami') || [];

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">管理者ダッシュボード</h1>
                    <p className="text-muted-foreground">登録ユーザーの管理とプロジェクト割り当て</p>
                </div>
                <Button variant="outline" onClick={() => setLocation("/dashboard")}>戻る</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>ユーザー一覧</CardTitle>
                    <CardDescription>
                        全ユーザー数: {filteredUsers.length}人
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>名前</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>現在のプロジェクト</TableHead>
                                <TableHead>最終ログイン</TableHead>
                                <TableHead>権限</TableHead>
                                <TableHead className="text-right">アクション</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">読み込み中...</TableCell>
                                </TableRow>
                            )}
                            {!isLoading && filteredUsers.map((u: any) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.id}</TableCell>
                                    <TableCell>{u.name || "未設定"}</TableCell>
                                    <TableCell>{u.email || "未設定"}</TableCell>
                                    <TableCell>{u.projects?.[0]?.name || "-"}</TableCell>
                                    <TableCell>{new Date(u.lastSignedIn).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={u.role === 'admin' ? "default" : "secondary"}>
                                            {u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog open={isOpen && selectedUser?.id === u.id} onOpenChange={(open) => {
                                            setIsOpen(open);
                                            if (open) {
                                                setSelectedUser({ id: u.id, name: u.name || u.email || "User" });
                                                if (u.projects && u.projects.length > 0) {
                                                    setProjectId(u.projects[0].neuronProjectId);
                                                    setProjectName(u.projects[0].name);
                                                } else {
                                                    setProjectId("");
                                                    setProjectName("");
                                                }
                                            }
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">プロジェクト割当</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{selectedUser?.name} にプロジェクトを割り当て</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>プロジェクトを選択</Label>
                                                        <Select onValueChange={handleProjectSelect}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="既存のプロジェクトから選択" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {neuronProjects?.projects?.map((project: any) => (
                                                                    <SelectItem key={project.id} value={project.id}>
                                                                        {project.name || project.id}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-0 flex items-center">
                                                            <span className="w-full border-t" />
                                                        </div>
                                                        <div className="relative flex justify-center text-xs uppercase">
                                                            <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="pid">分析プロジェクト (ID)</Label>
                                                        <Input id="pid" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="例: p_12345" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="pname">プロジェクト表示名</Label>
                                                        <Input id="pname" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="例: mysite.com" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsOpen(false)}>キャンセル</Button>
                                                    <Button onClick={handleAssign} disabled={assignMutation.isPending}>
                                                        {assignMutation.isPending ? "処理中..." : "割り当て"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
