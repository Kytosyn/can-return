import { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitReport } from "../../lib/reports/service";
import { ISSUE_LABELS, type ReportIssueType } from "../../lib/reports/types";
import { Button } from "../ui/Button";

interface Props {
  rvmId: string;
  rvmName: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function ReportForm({ rvmId, rvmName, onSubmitted, onCancel }: Props) {
  const { t } = useTranslation();
  const [selectedIssue, setSelectedIssue] = useState<ReportIssueType | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedIssue) return;
    setSubmitting(true);
    try {
      await submitReport({
        rvmId,
        issue: selectedIssue,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => onSubmitted?.(), 1500);
    } catch {
      // Failed silently
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 text-center">
        <span className="text-3xl block mb-2">✅</span>
        <p className="text-white font-medium">Report submitted</p>
        <p className="text-xs text-gray-400 mt-1">Other users will see this alert. Thank you.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-white font-medium text-sm mb-1">Report an issue</p>
        <p className="text-xs text-gray-400">{rvmName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(ISSUE_LABELS) as [ReportIssueType, typeof ISSUE_LABELS[ReportIssueType]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSelectedIssue(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              selectedIssue === key
                ? "bg-gray-600 border-gray-500 text-white"
                : "bg-gray-900 border-gray-700 text-gray-300 active:bg-gray-700"
            }`}
          >
            <span>{val.icon}</span>
            {val.label}
          </button>
        ))}
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Additional details (optional)"
        rows={2}
        maxLength={200}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-500 resize-none"
      />

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!selectedIssue || submitting}
          size="sm"
          className="flex-1"
        >
          {submitting ? "Submitting…" : "Submit Report"}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500">Reports are anonymous. No personal data is collected.</p>
    </div>
  );
}
