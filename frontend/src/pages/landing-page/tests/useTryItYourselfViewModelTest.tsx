import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { FakeScanRepository, type FakeScanRepositorySeed } from "@/testing/fakes/FakeScanRepository";
import { SCANNED_COURSE_NAME, scannedCard } from "@/testing/fixtures/scan";
import { useTryItYourselfViewModel } from "../useTryItYourselfViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(seed: FakeScanRepositorySeed = { result: scannedCard }) {
  const repository = new FakeScanRepository(seed);
  const view = renderHook(() => useTryItYourselfViewModel(repository), { wrapper });
  return { repository, ...view };
}

const photo = () => new File(["card"], "card.jpg", { type: "image/jpeg" });

async function pick(result: { current: ReturnType<typeof useTryItYourselfViewModel> }, file = photo()) {
  act(() => result.current.pickPhoto(file));
  await waitFor(() => expect(result.current.photo).toBe(file));
  return file;
}

describe("useTryItYourselfViewModel", () => {
  it("reads the card's text as soon as a photo is picked, and sends it with the scan", async () => {
    const { result, repository } = renderVm({ result: scannedCard, text: "HOLE 1 2 3" });
    const file = await pick(result);
    await waitFor(() => expect(repository.readPhotos).toEqual([file]));

    act(() => result.current.setUserContext("my name is Sam"));
    act(() => result.current.extract());

    await waitFor(() => expect(repository.extractRequests).toHaveLength(1));
    expect(repository.extractRequests[0]).toEqual({
      photo: file,
      userContext: "my name is Sam",
      ocrText: "HOLE 1 2 3",
    });
  });

  it("scans without the text when none came back", async () => {
    const { result, repository } = renderVm({ result: scannedCard, text: null });
    await pick(result);
    await waitFor(() => expect(repository.readPhotos).toHaveLength(1));

    act(() => result.current.extract());

    await waitFor(() => expect(repository.extractRequests).toHaveLength(1));
    expect(repository.extractRequests[0].ocrText).toBeNull();
  });

  it("shows the scan in progress, then the card as a round", async () => {
    const { result, repository } = renderVm({ result: scannedCard, holdExtract: true });
    await pick(result);

    act(() => result.current.extract());
    await waitFor(() => expect(result.current.step).toBe("processing"));
    expect(result.current.phase).toBe(0);

    act(() => repository.finishExtract());
    await waitFor(() => expect(result.current.step).toBe("review"));
    expect(result.current.round?.course?.name).toBe(SCANNED_COURSE_NAME);
    expect(result.current.hasScores).toBe(true);
  });

  it("returns to the photo with the reason when the scan fails", async () => {
    const { result } = renderVm({ extractError: "We couldn't read that card." });
    const file = await pick(result);

    act(() => result.current.extract());

    await waitFor(() => expect(result.current.error).toBe("We couldn't read that card."));
    expect(result.current.step).toBe("upload");
    expect(result.current.photo).toBe(file);
  });

  it("clears the last failure when another photo is picked", async () => {
    const { result } = renderVm({ extractError: "We couldn't read that card." });
    await pick(result);
    act(() => result.current.extract());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await pick(result);

    expect(result.current.error).toBeNull();
  });

  it("starts over with no photo and no scan", async () => {
    const { result } = renderVm();
    await pick(result);
    act(() => result.current.extract());
    await waitFor(() => expect(result.current.step).toBe("review"));

    act(() => result.current.reset());

    expect(result.current.step).toBe("upload");
    expect(result.current.photo).toBeNull();
    expect(result.current.round).toBeNull();
  });
});
