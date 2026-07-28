import { ProductShowcase } from "@/features/marketplace/landing/ProductShowcase";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ProductShowcase", () => {
  it("switches the visible mockup panel when a different tab is selected", () => {
    render(<ProductShowcase />);

    expect(screen.getByText("Fitness Transformation Challenge")).toBeInTheDocument();

    // Radix's Tabs.Trigger activates on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Applications/i }));

    expect(screen.getByText("@arjun_fitlife")).toBeInTheDocument();
    expect(screen.getByText(/72K followers, real transformation content/)).toBeInTheDocument();
  });
});
