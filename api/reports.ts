import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Persistent RVM reports API using Vercel KV (Redis).
 *
 * Storage design:
 *   Key: "rvm:reports" — a Redis List storing all reports as JSON strings.
 *   Reports expire after 7 days (handled on read).
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

const KV_KEY = "rvm:reports";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPORTS = 2000;

const VALID_ISSUES = ["full", "broken", "offline", "damaged", "slow", "other"];

async function getAllReports(): Promise<RvmReport[]> {
  const raw = await kv.lrange<string>(KV_KEY, 0, -1);
  if (!raw || raw.length === 0) return [];

  const cutoff = Date.now() - MAX_AGE_MS;
  const reports: RvmReport[] = [];

  for (const item of raw) {
    try {
      const r = typeof item === "string" ? JSON.parse(item) : item;
      if (new Date(r.createdAt).getTime() > cutoff) {
        reports.push(r);
      }
    } catch {
      // Skip malformed entries
    }
  }

  return reports;
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
      const reports = await getAllReports();
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

      // Push to the front of the list
      await kv.lpush(KV_KEY, JSON.stringify(report));

      // Trim to max size
      await kv.ltrim(KV_KEY, 0, MAX_REPORTS - 1);

      return res.status(201).json(report);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Reports API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
