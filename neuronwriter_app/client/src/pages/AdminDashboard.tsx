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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Coins, UserPlus, Edit, Key } from "lucide-react";

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

    // クレジット付与用の状態
    const [creditUser, setCreditUser] = useState<{ id: number; name: string; credits: number } | null>(null);
    const [creditAmount, setCreditAmount] = useState("1");
    const [isCreditOpen, setIsCreditOpen] = useState(false);

    // ユーザー登録用の状態
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");

    // ユーザー編集用の状態
    const [editUser, setEditUser] = useState<{ id: number; name: string; email: string; role: string } | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editRole, setEditRole] = useState<"user" | "admin">("user");

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

    const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const deleteMutation = trpc.admin.deleteUser.useMutation({
        onSuccess: () => {
            toast.success("ユーザーを削除しました");
            setIsDeleteOpen(false);
            setUserToDelete(null);
            refetch();
        },
        onError: (e: any) => {
            toast.error(`削除失敗: ${e.message}`);
        }
    });

    // クレジット付与ミューテーション
    const grantCreditsMutation = trpc.billing.grantCredits.useMutation({
        onSuccess: (data: any) => {
            toast.success(`${data.creditsAdded} クレジットを付与しました（残高: ${data.newBalance}）`);
            setIsCreditOpen(false);
            setCreditAmount("1");
            refetch();
        },
        onError: (e: any) => {
            toast.error(`クレジット付与失敗: ${e.message}`);
        }
    });

    // ユーザー作成ミューテーション
    const createUserMutation = trpc.admin.createUser.useMutation({
        onSuccess: () => {
            toast.success("ユーザーを作成しました");
            setIsCreateUserOpen(false);
            setNewUserName("");
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserRole("user");
            refetch();
        },
        onError: (e: any) => {
            toast.error(`ユーザー作成失敗: ${e.message}`);
        }
    });

    // ユーザー更新ミューテーション
    const updateUserMutation = trpc.admin.updateUser.useMutation({
        onSuccess: () => {
            toast.success("ユーザー情報を更新しました");
            setIsEditOpen(false);
            setEditUser(null);
            refetch();
        },
        onError: (e: any) => {
            toast.error(`更新失敗: ${e.message}`);
        }
    });

    const handleCreateUser = () => {
        if (!newUserName || !newUserEmail || !newUserPassword) {
            toast.error("全ての項目を入力してください");
            return;
        }
        createUserMutation.mutate({
            name: newUserName,
            email: newUserEmail,
            password: newUserPassword,
            role: newUserRole,
        });
    };

    const handleUpdateUser = () => {
        if (!editUser) return;
        updateUserMutation.mutate({
            userId: editUser.id,
            name: editName,
            email: editEmail,
            role: editRole,
        });
    };

    const openEditDialog = (u: any) => {
        setEditUser(u);
        setEditName(u.name || "");
        setEditEmail(u.email || "");
        setEditRole(u.role || "user");
        setIsEditOpen(true);
    };

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

            {/* Admin専用ナビゲーション */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => setLocation("/admin/new-query")}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Coins className="h-5 w-5 text-primary" />
                            クエリ作成
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">全プロジェクト選択可能・詳細設定付き</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/50 transition-all cursor-pointer" onClick={() => setLocation("/admin/queries")}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-primary" />
                            全クエリ一覧
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">全ユーザーのクエリを管理</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>ユーザー一覧</CardTitle>
                        <CardDescription>
                            全ユーザー数: {filteredUsers.length}人
                        </CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateUserOpen(true)} className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        新規ユーザー登録
                    </Button>
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
                                <TableHead>クレジット</TableHead>
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
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-yellow-500" />
                                            <span className="font-medium">{u.credits ?? 0}</span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => {
                                                    setCreditUser({ id: u.id, name: u.name || "User", credits: u.credits ?? 0 });
                                                    setCreditAmount("1");
                                                    setIsCreditOpen(true);
                                                }}
                                                disabled={u.role === 'admin'}
                                            >
                                                +付与
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.role === 'admin' ? "default" : "secondary"}>
                                            {u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* 編集ボタン */}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditDialog(u)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {/* プロジェクト割当ダイアログ */}
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

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setUserToDelete({ id: u.id, name: u.name || "User" });
                                                    setIsDeleteOpen(true);
                                                }}
                                                disabled={u.role === 'admin'}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当にユーザーを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            ユーザー「{userToDelete?.name}」を削除しようとしています。<br />
                            この操作は取り消せません。ユーザーに関連するすべてのプロジェクト、コンテンツ、履歴が完全に削除されます。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (userToDelete) {
                                    deleteMutation.mutate({ userId: userToDelete.id });
                                }
                            }}
                        >
                            {deleteMutation.isPending ? "削除中..." : "削除する"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* クレジット付与ダイアログ */}
            <Dialog open={isCreditOpen} onOpenChange={setIsCreditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Coins className="h-5 w-5 text-yellow-500" />
                            クレジット付与
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">対象ユーザー</p>
                            <p className="font-medium">{creditUser?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">現在の残高</p>
                            <p className="font-medium">{creditUser?.credits ?? 0} クレジット</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="creditAmount">付与するクレジット数</Label>
                            <Input
                                id="creditAmount"
                                type="number"
                                min="1"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                                placeholder="例: 10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreditOpen(false)}>キャンセル</Button>
                        <Button
                            onClick={() => {
                                if (creditUser && creditAmount) {
                                    grantCreditsMutation.mutate({
                                        userId: creditUser.id,
                                        amount: parseInt(creditAmount, 10)
                                    });
                                }
                            }}
                            disabled={grantCreditsMutation.isPending || !creditAmount || parseInt(creditAmount, 10) <= 0}
                        >
                            {grantCreditsMutation.isPending ? "処理中..." : `${creditAmount} クレジットを付与`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ユーザー作成ダイアログ */}
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            新規ユーザー登録
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newUserName">名前</Label>
                            <Input
                                id="newUserName"
                                placeholder="山田 太郎"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newUserEmail">メールアドレス</Label>
                            <Input
                                id="newUserEmail"
                                type="email"
                                placeholder="user@example.com"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newUserPassword">パスワード</Label>
                            <Input
                                id="newUserPassword"
                                type="password"
                                placeholder="********"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>権限</Label>
                            <Select value={newUserRole} onValueChange={(v: "user" | "admin") => setNewUserRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">ユーザー</SelectItem>
                                    <SelectItem value="admin">管理者</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>キャンセル</Button>
                        <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                            {createUserMutation.isPending ? "作成中..." : "ユーザー作成"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ユーザー編集ダイアログ */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            ユーザー情報編集
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="editName">名前</Label>
                            <Input
                                id="editName"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editEmail">メールアドレス</Label>
                            <Input
                                id="editEmail"
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>権限</Label>
                            <Select value={editRole} onValueChange={(v: "user" | "admin") => setEditRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">ユーザー</SelectItem>
                                    <SelectItem value="admin">管理者</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>キャンセル</Button>
                        <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                            {updateUserMutation.isPending ? "更新中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
