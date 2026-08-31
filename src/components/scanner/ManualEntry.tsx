import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

interface Props {
  onSubmit: (barcode: string) => void;
}

export function ManualEntry({ onSubmit }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.replace(/\s/g, "");
    if (/^\d{8,13}$/.test(trimmed)) {
      onSubmit(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-300">
        {t("manual.label")}
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        placeholder={t("manual.placeholder")}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-500"
        maxLength={13}
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={!/^\d{8,13}$/.test(value.replace(/\s/g, ""))}
      >
        {t("manual.checkEligibility")}
      </Button>
    </form>
  );
}
