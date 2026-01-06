"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { ArticleStructure } from "@/lib/seo-generator/types";

export default function GeneratorPage() {
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [structure, setStructure] = useState<ArticleStructure | null>(null);

    // Note: Future implementation will handle the actual generation based on these values
    const handleCreateQuery = async () => {
        setLoading(true);
        // Simulation for now
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setLoading(false);
        alert("この画面のデザインを優先したため、ロジックとの連携は次のステップで行います。");
    };

    return (
        <div className="min-h-screen bg-[#fcfdff] p-6 lg:p-12 flex flex-col items-center">
            <div className="w-full max-w-4xl space-y-8">
                {/* Back Button */}
                <Link
                    href="/"
                    className="flex items-center text-[#1a1c1e] font-bold text-lg hover:opacity-70 transition-opacity"
                >
                    <ArrowLeft className="mr-3 h-5 w-5" />
                    ダッシュボードに戻る
                </Link>

                {/* Main Content Card */}
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] bg-white overflow-hidden">
                    <CardContent className="p-10 lg:p-16 space-y-12">
                        {/* Header */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#f0f4ff] p-3 rounded-2xl">
                                    <Sparkles className="h-10 w-10 text-[#635bff]" />
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1a1c1e]">
                                    新しいクエリを作成
                                </h1>
                            </div>
                            <p className="text-xl text-muted-foreground font-medium pl-1">
                                キーワードを入力してSEOコンテンツ推薦を生成
                            </p>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-10">
                            {/* Project Selection */}
                            <div className="space-y-3">
                                <Label className="text-lg font-bold text-[#1a1c1e]">NeuronWriterプロジェクト</Label>
                                <Select>
                                    <SelectTrigger className="h-16 text-lg rounded-2xl border-2 border-gray-100 bg-gray-50/30 px-6">
                                        <SelectValue placeholder="プロジェクトを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="proj1">デフォルトプロジェクト</SelectItem>
                                        <SelectItem value="proj2">新規クライアントA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Keyword Input */}
                            <div className="space-y-3">
                                <Label className="text-lg font-bold text-[#1a1c1e]">キーワード</Label>
                                <Input
                                    placeholder="ターゲットキーワードを入力..."
                                    className="h-16 text-lg rounded-2xl border-2 border-gray-100 bg-gray-50/30 px-6 focus-visible:ring-[#635bff]"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </div>

                            {/* Meta Selection row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-lg font-bold text-[#1a1c1e]">言語</Label>
                                    <Select defaultValue="japanese">
                                        <SelectTrigger className="h-16 text-lg rounded-2xl border-2 border-gray-100 bg-gray-50/30 px-6">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="japanese">Japanese</SelectItem>
                                            <SelectItem value="english">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-lg font-bold text-[#1a1c1e]">検索エンジン</Label>
                                    <Select defaultValue="google_jp">
                                        <SelectTrigger className="h-16 text-lg rounded-2xl border-2 border-gray-100 bg-gray-50/30 px-6">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="google_jp">Google Japan</SelectItem>
                                            <SelectItem value="google_us">Google USA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <Button
                            className="w-full h-16 text-xl font-bold rounded-2xl bg-[#635bff] hover:bg-[#5249e0] transition-colors shadow-lg shadow-[#635bff]/20 mt-6"
                            onClick={handleCreateQuery}
                            disabled={loading || !keyword}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="mr-3 h-6 w-6" />
                                    クエリ作成
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
