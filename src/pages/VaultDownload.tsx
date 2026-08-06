import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

function extractFilename(contentDisposition?: string): string | null {
  if (!contentDisposition) return null;
  const filenameStarMatch = /filename\*=UTF-8''([^;\n\r]+)/i.exec(contentDisposition);
  if (filenameStarMatch?.[1]) {
    return decodeURIComponent(filenameStarMatch[1]);
  }
  const filenameMatch = /filename="?([^";\n\r]+)"?/i.exec(contentDisposition);
  return filenameMatch?.[1] ?? null;
}

export default function VaultDownload() {
  const { t } = useLanguage();
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const loadFile = async () => {
      if (!fileId) {
        setErrorMessage(t("gr_vd_invalid_id"));
        setStatus("error");
        return;
      }

      try {
        const response = await vaultApi.download(fileId);
        const contentType = String(response.headers["content-type"] ?? "application/octet-stream");
        const disposition = response.headers["content-disposition"];
        const fileName = extractFilename(typeof disposition === "string" ? disposition : undefined) || fileId;
        const blob = new Blob([response.data], { type: contentType });

        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
        setStatus("success");
      } catch (error: any) {
        const message = error?.response?.status === 404 ? t("gr_vd_not_found") : t("gr_vd_unable");
        setErrorMessage(message);
        setStatus("error");
        toast({ title: t("gr_vd_download_failed"), description: message, variant: "destructive" });
      }
    };

    void loadFile();
  }, [fileId, toast]);

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
        <Card className="max-w-xl w-full border-border/70 bg-card/80 p-8 shadow-lg">
          <div className="flex flex-col items-center gap-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <h1 className="text-lg font-semibold">{t("gr_vd_downloading")}</h1>
                <p className="text-sm text-muted-foreground">{t("gr_vd_downloading_desc")}</p>
              </>
            )}
            {status === "success" && (
              <>
                <Download className="w-10 h-10 text-primary" />
                <h1 className="text-lg font-semibold">{t("gr_vd_started")}</h1>
                <p className="text-sm text-muted-foreground">{t("gr_vd_started_desc")}</p>
              </>
            )}
            {status === "error" && (
              <>
                <h1 className="text-lg font-semibold">{t("gr_vd_failed_title")}</h1>
                <p className="text-sm text-destructive">{errorMessage}</p>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("gr_vd_go_back")}
              </Button>
              {status === "success" && fileId && (
                <Button variant="default" size="sm" onClick={() => window.location.reload()}>
                  {t("gr_vd_retry")}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
