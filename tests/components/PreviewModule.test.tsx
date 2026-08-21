import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewModule } from "@/components/modules/PreviewModule";
import { EvidenceBadge } from "@/components/data/EvidenceBadge";

describe("PreviewModule", () => {
  it("shows at most five preview rows and an Open table action", () => {
    render(
      <PreviewModule
        title="Standings"
        summary="2025 final"
        rows={[1, 2, 3, 4, 5, 6].map(String)}
        evidence="verified"
        onOpen={() => {}}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /open table/i })).toBeInTheDocument();
  });

  it("makes the conclusion the primary element, not the rows", () => {
    render(
      <PreviewModule
        title="Power"
        summary="Shadowcöcks led every week"
        conclusion="72.1%"
        rows={["a"]}
        evidence="verified"
        onOpen={() => {}}
      />,
    );
    expect(screen.getByTestId("preview-conclusion")).toHaveTextContent("72.1%");
  });

  it("reports how many rows are hidden behind the explorer", () => {
    render(
      <PreviewModule
        title="Auction"
        summary="2025 board"
        rows={Array.from({ length: 192 }, (_, i) => `pick ${i}`)}
        evidence="verified"
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText(/192/)).toBeInTheDocument();
  });

  it("calls onOpen when the explorer action is used", async () => {
    const onOpen = vi.fn();
    render(
      <PreviewModule
        title="Roto"
        summary="2025"
        rows={["a", "b"]}
        evidence="verified"
        onOpen={onOpen}
      />,
    );
    screen.getByRole("button", { name: /open table/i }).click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("renders an unavailable module as an explanation, never as zeros", () => {
    render(
      <PreviewModule
        title="Bench detail"
        summary="Pre-2018 benches"
        rows={[]}
        evidence="unavailable"
        missingReason="outside_source_coverage"
      />,
    );
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/outside source coverage/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open table/i })).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });
});

describe("EvidenceBadge", () => {
  it("names each evidence state in plain language", () => {
    const { rerender } = render(<EvidenceBadge status="verified" />);
    expect(screen.getByText(/verified/i)).toBeInTheDocument();

    rerender(<EvidenceBadge status="reconstructed" />);
    expect(screen.getByText(/reconstructed/i)).toBeInTheDocument();

    rerender(<EvidenceBadge status="unavailable" />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
