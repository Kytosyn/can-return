export type ReportIssueType =
  | "full"
  | "broken"
  | "offline"
  | "damaged"
  | "slow"
  | "other";

export interface RvmReport {
  id: string;
  rvmId: string;
  issue: ReportIssueType;
  description?: string;
  createdAt: string;
  /** Whether this report has been confirmed by other users */
  confirmations: number;
}

export interface ReportSubmission {
  rvmId: string;
  issue: ReportIssueType;
  description?: string;
}

export const ISSUE_LABELS: Record<ReportIssueType, { label: string; icon: string; color: string }> = {
  full: { label: "Machine Full", icon: "🔴", color: "#ef4444" },
  broken: { label: "Broken / Not Working", icon: "🔧", color: "#f59e0b" },
  offline: { label: "Offline / Unplugged", icon: "⚡", color: "#6b7280" },
  damaged: { label: "Damaged / Dirty", icon: "⚠️", color: "#f59e0b" },
  slow: { label: "Slow / Jammed", icon: "🐌", color: "#f59e0b" },
  other: { label: "Other Issue", icon: "📝", color: "#6b7280" },
};
