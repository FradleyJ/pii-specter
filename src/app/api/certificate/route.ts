import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getUserInfo } from "@/lib/auth";
import { getLatestScan } from "@/lib/supabase";
import { generateCertificatePDF } from "@/lib/certificate";

export async function GET(req: NextRequest) {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(client);
    const lastScan = await getLatestScan(userInfo.id!);

    if (!lastScan) {
      return NextResponse.json({ error: "No scan results found. Run a scan first." }, { status: 404 });
    }

    if (!lastScan.all_clean) {
      return NextResponse.json(
        { error: "Cannot generate certificate. PII issues remain unresolved." },
        { status: 403 }
      );
    }

    const firmName = req.nextUrl.searchParams.get("firm") || "CPA Practice";

    const pdfBuffer = generateCertificatePDF({
      firmName,
      userEmail: userInfo.email!,
      scanDate: lastScan.scanned_at,
      totalFiles: lastScan.total_files,
      filesScanned: lastScan.total_files,
      allClean: true,
      verificationMethod: "Regex + Gemini 1.5 Flash dual verification",
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PII-Compliance-Certificate-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Certificate error:", err);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}
