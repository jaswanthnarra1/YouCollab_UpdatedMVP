import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEditableForm } from "@/hooks/useEditableForm";

const INITIAL = { name: "Riya", niche: "Fashion", pincode: "411001" };

describe("useEditableForm", () => {
  it("starts in view mode, not dirty", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    expect(result.current.editing).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it("enables editing without becoming dirty", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    act(() => result.current.startEdit());
    expect(result.current.editing).toBe(true);
    // Save must stay disabled until something actually changes.
    expect(result.current.isDirty).toBe(false);
  });

  it("becomes dirty when a field changes", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    act(() => result.current.startEdit());
    act(() => result.current.setField("name", "Riya Sen"));
    expect(result.current.isDirty).toBe(true);
  });

  it("goes back to clean when a field is reverted to its original value", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    act(() => result.current.startEdit());
    act(() => result.current.setField("name", "Changed"));
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.setField("name", "Riya"));
    // This is the case a naive "hasEdited" boolean would get wrong.
    expect(result.current.isDirty).toBe(false);
  });

  it("discard restores originals and exits edit mode", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    act(() => result.current.startEdit());
    act(() => result.current.setField("name", "Changed"));
    act(() => result.current.setField("pincode", "999999"));
    act(() => result.current.discard());
    expect(result.current.values).toEqual(INITIAL);
    expect(result.current.editing).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it("commit keeps the new values and makes them the baseline", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    act(() => result.current.startEdit());
    act(() => result.current.setField("name", "Saved Name"));
    act(() => result.current.commit());
    expect(result.current.values.name).toBe("Saved Name");
    expect(result.current.editing).toBe(false);
    // Clean again, so Save is disabled on re-entering edit mode.
    expect(result.current.isDirty).toBe(false);
  });

  it("hydrate replaces both values and baseline", () => {
    const { result } = renderHook(() => useEditableForm(INITIAL));
    const fresh = { name: "From Server", niche: "Food", pincode: "411011" };
    act(() => result.current.hydrate(fresh));
    expect(result.current.values).toEqual(fresh);
    expect(result.current.isDirty).toBe(false);
  });
});
