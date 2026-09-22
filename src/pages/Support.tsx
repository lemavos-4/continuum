import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/lib/heroicons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import supportContent from "/support.md?raw";

export default function Support() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Button
          asChild
          variant="link"
          className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-foreground"
        >
          <button onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </Button>

        <article className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {supportContent}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
