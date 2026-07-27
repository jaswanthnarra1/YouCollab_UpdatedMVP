import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const renderConfirm = (onConfirm: () => void) =>
  render(
    <ConfirmDialog
      title="Reject this applicant?"
      description="Are you sure you want to reject this creator's application?"
      confirmLabel="Confirm Reject"
      onConfirm={onConfirm}
      trigger={<button>Reject</button>}
    />,
  );

describe("ConfirmDialog", () => {
  it("does not run the action until the user confirms", () => {
    const onConfirm = vi.fn();
    renderConfirm(onConfirm);

    fireEvent.click(screen.getByText("Reject"));
    expect(screen.getByText("Reject this applicant?")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Confirm Reject"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("runs nothing when cancelled", () => {
    const onConfirm = vi.fn();
    renderConfirm(onConfirm);

    fireEvent.click(screen.getByText("Reject"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ErrorBoundary", () => {
  it("shows a recovery state instead of a blank screen when a child throws", () => {
    const Boom = () => {
      throw new Error("render exploded");
    };
    // React logs the caught error; silence it so the run stays readable.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ErrorBoundary><Boom /></ErrorBoundary>);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    spy.mockRestore();
  });
});
