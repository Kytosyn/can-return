import { put, head } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Persistent RVM reports API using Vercel Blob.
 *
 * Stores all reports as a single JSON file in Blob storage.
 * Free tier: 500MB storage, 10GB bandwidth/month.
 *
 * All reports are anonymous — no user IDs, no IP logging, no cookies.
 */

interface RvmReport {
  id: string;
  rvmId: string;
  issue: string;
  description?: string;
  createdAt: string;
  confirmations: number;
}

const BLOB_PATH = "rvm-reports.json";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPORTS = 2000;
const VALID_ISSUES = ["full", "broken", "offline", "damaged", "slow", "other"];

async function loadReports(): Promise<RvmReport[]> {
  try {
    const exists = await head(BLOB_PATH).catch(() => null);
    if (!exists) return [];

    const res = await fetch(exists.url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveReports(reports: RvmReport[]): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(reports), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

function pruneExpired(reports: RvmReport[]): RvmReport[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return reports.filter((r) => new Date(r.createdAt).getTime() > cutoff);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const reports = pruneExpired(await loadReports());
      return res.status(200).json(reports);
    }

    if (req.method === "POST") {
      const body = req.body;

      if (!body?.rvmId || !body?.issue) {
        return res.status(400).json({ error: "rvmId and issue are required" });
      }

      if (!VALID_ISSUES.includes(body.issue)) {
        return res.status(400).json({ error: "Invalid issue type" });
      }

      const report: RvmReport = {
        id: body.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        rvmId: String(body.rvmId),
        issue: body.issue,
        description: body.description ? String(body.description).slice(0, 200) : undefined,
        createdAt: body.createdAt || new Date().toISOString(),
        confirmations: 0,
      };

      // Load, append, prune, save
      const reports = pruneExpired(await loadReports());
      reports.unshift(report);
      if (reports.length > MAX_REPORTS) reports.length = MAX_REPORTS;
      await saveReports(reports);

      return res.status(201).json(report);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Reports API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
