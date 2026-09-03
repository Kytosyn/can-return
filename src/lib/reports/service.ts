import { get, set } from "idb-keyval";
import type { RvmReport, ReportSubmission, ReportIssueType } from "./types";

const REPORTS_KEY = "bcrs:rvm-reports";
const API_BASE = "/api/reports";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let lastSync = 0;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Load all reports from local storage.
 */
export async function loadLocalReports(): Promise<RvmReport[]> {
  return (await get<RvmReport[]>(REPORTS_KEY)) ?? [];
}

/**
 * Save reports to local storage.
 */
async function saveLocalReports(reports: RvmReport[]): Promise<void> {
  await set(REPORTS_KEY, reports);
}

/**
 * Submit a new report. Saves locally and tries to sync to API.
 */
export async function submitReport(submission: ReportSubmission): Promise<RvmReport> {
  const report: RvmReport = {
    id: generateId(),
    rvmId: submission.rvmId,
    issue: submission.issue,
    description: submission.description,
    createdAt: new Date().toISOString(),
    confirmations: 0,
  };

  // Save locally
  const reports = await loadLocalReports();
  reports.unshift(report);
  await saveLocalReports(reports);

  // Try to sync to API (fire and forget)
  syncToApi(report).catch(() => {});

  return report;
}

/**
 * Confirm an existing report (user saw the same issue).
 */
export async function confirmReport(reportId: string): Promise<void> {
  const reports = await loadLocalReports();
  const report = reports.find((r) => r.id === reportId);
  if (report) {
    report.confirmations++;
    await saveLocalReports(reports);
  }
}

/**
 * Get reports for a specific RVM.
 */
export async function getReportsForRvm(rvmId: string): Promise<RvmReport[]> {
  const reports = await loadLocalReports();
  return reports.filter((r) => r.rvmId === rvmId);
}

/**
 * Get the most recent/severe report for each RVM.
 * Returns a map of rvmId → report summary.
 */
export async function getRvmReportSummary(): Promise<Map<string, { count: number; topIssue: ReportIssueType; latest: string }>> {
  const reports = await loadLocalReports();
  const summary = new Map<string, { count: number; topIssue: ReportIssueType; latest: string }>();

  for (const report of reports) {
    const existing = summary.get(report.rvmId);
    if (!existing || new Date(report.createdAt) > new Date(existing.latest)) {
      summary.set(report.rvmId, {
        count: (existing?.count ?? 0) + 1,
        topIssue: report.issue,
        latest: report.createdAt,
      });
    } else {
      existing.count++;
    }
  }

  return summary;
}

/**
 * Sync a report to the API. Silently fails if offline.
 */
async function syncToApi(report: RvmReport): Promise<void> {
  try {
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
  } catch {
    // Offline — will sync on next fetch
  }
}

/**
 * Fetch reports from API and merge with local.
 * Skips if synced recently.
 */
export async function syncReportsFromApi(): Promise<void> {
  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) return;

  try {
    const res = await fetch(API_BASE);
    if (!res.ok) return;
    const remote: RvmReport[] = await res.json();

    const local = await loadLocalReports();
    const localIds = new Set(local.map((r) => r.id));

    // Merge remote reports we don't have locally
    const merged = [...local];
    for (const r of remote) {
      if (!localIds.has(r.id)) {
        merged.push(r);
      }
    }

    // Sort by newest first, keep last 500
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    merged.length = Math.min(merged.length, 500);

    await saveLocalReports(merged);
    lastSync = now;
  } catch {
    // Offline — use local data
  }
}

/**
 * Clear all local reports.
 */
export async function clearReports(): Promise<void> {
  await set(REPORTS_KEY, []);
}
