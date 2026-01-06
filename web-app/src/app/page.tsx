"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, FileText, BarChart3, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const menuItems = [
    {
      title: "クエリ作成",
      description: "AI搭載の推薦機能で新しいSEOコンテンツクエリを開始",
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      href: "/generator",
      color: "bg-primary/10",
    },
    {
      title: "クエリー一覧",
      description: "全てのコンテンツクエリを一箇所で管理",
      icon: <FileText className="h-8 w-8 text-primary" />,
      href: "#",
      color: "bg-primary/10",
    },
    {
      title: "分析",
      description: "SEOパフォーマンスとコンテンツインサイトを追跡",
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      href: "#",
      color: "bg-primary/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {menuItems.map((item, idx) => (
            <Link key={idx} href={item.href} className="group">
              <Card className="h-full border-2 border-primary/5 hover:border-primary/20 hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-10 flex flex-col items-start space-y-6">
                  {/* Icon Container with background like in image */}
                  <div className={`${item.color} p-5 rounded-3xl group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                      {item.title}
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Optional arrow to enhance the "Link" feel */}
                  <div className="pt-4 flex items-center text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                    詳細を見る
                    <ChevronRight className="ml-1 h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
