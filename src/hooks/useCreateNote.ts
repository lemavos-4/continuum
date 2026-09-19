import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notesApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries";

interface UseCreateNoteOptions {
  /** Called when the plan limit is reached (e.g. open the upgrade modal). */
  onLimitReached?: () => void;
}

/**
 * Centralised, reliable "create a new note" action.
 * Creates the note on the server first, then navigates to the real note id.
 * This avoids the previous optimistic flow that could leave the user stranded
 * on a temporary URL when the backend was slow or the request failed.
 */
export function useCreateNote(options: UseCreateNoteOptions = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreateNote, refresh, applyUsageDelta } = usePlanGate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const inFlight = useRef(false);

  const createNote = useCallback(async () => {
    if (inFlight.current) return;

    if (!canCreateNote) {
      options.onLimitReached?.();
      return;
    }

    inFlight.current = true;
    setCreating(true);
    applyUsageDelta({ notesCount: 1 });

    try {
      const { data } = await notesApi.create("Untitled", "");
      if (!data?.id) throw new Error("Invalid response from server");
      queryClient.setQueryData(qk.note(data.id), data);
      void queryClient.invalidateQueries({ queryKey: qk.notes() });
      void refresh();
      navigate(`/notes/${data.id}`);
    } catch (err: any) {
      applyUsageDelta({ notesCount: -1 });
      if (err?.response?.status === 403) {
        options.onLimitReached?.();
      } else {
        toast({
          title: "Could not create note",
          description: err?.response?.data?.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  }, [canCreateNote, applyUsageDelta, refresh, navigate, toast, options, queryClient]);

  return { createNote, creating, canCreateNote };
}