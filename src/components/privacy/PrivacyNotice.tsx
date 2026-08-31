import { useTranslation } from "react-i18next";

export function PrivacyNotice() {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-6 space-y-4 text-sm text-gray-300 leading-relaxed">
      <h2 className="text-lg font-bold text-white">{t("privacy.title")}</h2>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">{t("privacy.onDevice")}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>{t("privacy.barcodeScanning")}</strong> {t("privacy.barcodeScanningDesc")}</li>
          <li><strong>{t("privacy.eligibilityChecks")}</strong> {t("privacy.eligibilityChecksDesc")}</li>
          <li><strong>{t("privacy.scanHistory")}</strong> {t("privacy.scanHistoryDesc")}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">{t("privacy.network")}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>{t("privacy.databaseUpdates")}</strong> {t("privacy.databaseUpdatesDesc")}</li>
          <li><strong>{t("privacy.returnPointLocations")}</strong> {t("privacy.returnPointLocationsDesc")}</li>
          <li><strong>{t("privacy.geolocation")}</strong> {t("privacy.geolocationDesc")}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">{t("privacy.neverDo")}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("privacy.noAccount")}</li>
          <li>{t("privacy.noCookies")}</li>
          <li>{t("privacy.noAnalytics")}</li>
          <li>{t("privacy.noDataSold")}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">{t("privacy.yourControls")}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>{t("privacy.deleteLocalData")}</strong> {t("privacy.deleteLocalDataDesc")}</li>
          <li><strong>{t("privacy.cameraPermission")}</strong> {t("privacy.cameraPermissionDesc")}</li>
          <li><strong>{t("privacy.locationPermission")}</strong> {t("privacy.locationPermissionDesc")}</li>
        </ul>
      </section>

      <p className="text-xs text-gray-500 pt-4 border-t border-gray-800">{t("privacy.disclaimer")}</p>
    </div>
  );
}
