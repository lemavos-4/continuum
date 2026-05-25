import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download } from "@/lib/heroicons";
import { useToast } from "@/hooks/use-toast";

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
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const loadFile = async () => {
      if (!fileId) {
        setErrorMessage("Invalid file identifier.");
        setStatus("error");
        return;
      }

      try {
        const response = await vaultApi.download(fileId);
        const contentType = response.headers["content-type"] || "application/octet-stream";
        const disposition = response.headers["content-disposition"];
        const fileName = extractFilename(disposition) || fileId;
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
        const message = error?.response?.status === 404 ? "File not found." : "Unable to download file.";
        setErrorMessage(message);
        setStatus("error");
        toast({ title: "Download failed", description: message, variant: "destructive" });
      }
    };

    void loadFile();
  }, [fileId, toast]);

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
        <div className="max-w-xl w-full rounded-2xl border border-border/70 bg-card/80 p-8 shadow-lg">
          <div className="flex flex-col items-center gap-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <h1 className="text-lg font-semibold">Downloading file...</h1>
                <p className="text-sm text-muted-foreground">Your file will download automatically. Close this page once it finishes.</p>
              </>
            )}
            {status === "success" && (
              <>
                <Download className="w-10 h-10 text-primary" />
                <h1 className="text-lg font-semibold">Download started</h1>
                <p className="text-sm text-muted-foreground">If the download did not start, use the button below.</p>
              </>
            )}
            {status === "error" && (
              <>
                <h1 className="text-lg font-semibold">Download failed</h1>
                <p className="text-sm text-destructive">{errorMessage}</p>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Go back
              </Button>
              {status === "success" && fileId && (
                <Button variant="default" size="sm" onClick={() => window.location.reload()}>
                  Retry download
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
