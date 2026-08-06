import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function PwaInstallListener() {
  usePwaInstall();
  return null;
}
