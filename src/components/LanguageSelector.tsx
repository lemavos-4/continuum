import { AVAILABLE_LANGUAGES, useLanguage, Language } from "@/contexts/LanguageContext";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: Props) {
  const { language, setLanguage, t } = useLanguage();

  if (compact) {
    return (
      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code} className="text-xs">
              {l.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-4 py-4">
      <GlobeAltIcon className="h-4 w-4 text-foreground/30 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground/70">{t("profile_language")}</p>
        <p className="text-xs text-foreground/30 truncate">{t("profile_languageDesc")}</p>
      </div>
      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code} className="text-xs">
              {l.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
