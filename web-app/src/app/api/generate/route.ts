import { NextRequest, NextResponse } from "next/server";
import { generateStructure } from "@/lib/seo-generator/phase1-structure";
import { integrateCompetitorHeaders } from "@/lib/seo-generator/phase2-headers";

export async function POST(req: NextRequest) {
    try {
        const json = await req.json();

        // Phase 1: Structure
        let structure = generateStructure(json);

        // Phase 2: Competitor Headers
        structure = integrateCompetitorHeaders(json, structure);

        return NextResponse.json({ success: true, structure });
    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ success: false, error: "Failed to generate structure" }, { status: 500 });
    }
}
