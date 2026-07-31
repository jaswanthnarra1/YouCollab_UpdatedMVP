import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * View/edit mode + dirty tracking for a profile form.
 *
 * Shared by the creator and brand profile pages, which need identical
 * behaviour: fields disabled until "Edit Profile" is pressed, "Save changes"
 * enabled only once something actually differs from the loaded values, and
 * "Discard" restoring the originals.
 *
 * Dirty state is computed by comparing against a baseline snapshot rather than
 * tracking a boolean, so editing a field and then putting it back to its
 * original value correctly returns to "not dirty".
 */

/** Shallow compare — sufficient here, as every profile field is a primitive. */
const isSame = <T extends Record<string, unknown>>(a: T, b: T) =>
  (Object.keys(a) as (keyof T)[]).every((k) => a[k] === b[k]);

export function useEditableForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [baseline, setBaseline] = useState<T>(initial);
  const [editing, setEditing] = useState(false);

  const isDirty = useMemo(() => !isSame(values, baseline), [values, baseline]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Adopt freshly-loaded server values as the new baseline. Callers should
   * skip this while `editing` is true, so a background refetch can't discard
   * what the user is part-way through typing.
   */
  const hydrate = useCallback((next: T) => {
    setValues(next);
    setBaseline(next);
  }, []);

  const startEdit = useCallback(() => setEditing(true), []);

  const discard = useCallback(() => {
    setValues(baseline);
    setEditing(false);
  }, [baseline]);

  /** Call after a save succeeds: the just-saved values become the new baseline. */
  const commit = useCallback(() => {
    setBaseline(values);
    setEditing(false);
  }, [values]);

  /**
   * Warn before losing unsaved edits. This covers refresh, tab close, and
   * navigating away from the SPA entirely.
   *
   * It does NOT cover in-app route changes: react-router v6's useBlocker
   * requires a data router, and this app mounts a plain <BrowserRouter>
   * (see routes/App.tsx). Switching to createBrowserRouter would be a
   * router-wide change well beyond this form, so it's deliberately left out
   * rather than half-implemented.
   */
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Browsers show their own generic wording; assigning returnValue is
      // what actually triggers the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return { values, setField, editing, isDirty, startEdit, discard, commit, hydrate };
}
