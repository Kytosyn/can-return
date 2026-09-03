import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Simple in-memory reports store.
 * In production, replace with a database (Vercel KV, Turso, PlanetScale, etc.)
 *
 * Reports are anonymous — no user IDs, no IP logging, no cookies.
 */

interface RvmReport {
  id: string;
  rvmId: string;
  issue: string;
  description?: string;
  createdAt: string;
  confirmations: number;
}

// In-memory store (resets on cold start — acceptable for MVP)
const reports: RvmReport[] = [];

// Expire reports older than 7 days
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function pruneExpired() {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (let i = reports.length - 1; i >= 0; i--) {
    if (new Date(reports[i].createdAt).getTime() < cutoff) {
      reports.splice(i, 1);
    }
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  pruneExpired();

  if (req.method === "GET") {
    // Return all non-expired reports
    return res.status(200).json(reports);
  }

  if (req.method === "POST") {
    const body = req.body;

    // Validate
    if (!body?.rvmId || !body?.issue) {
      return res.status(400).json({ error: "rvmId and issue are required" });
    }

    const validIssues = ["full", "broken", "offline", "damaged", "slow", "other"];
    if (!validIssues.includes(body.issue)) {
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

    reports.push(report);

    return res.status(201).json(report);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
