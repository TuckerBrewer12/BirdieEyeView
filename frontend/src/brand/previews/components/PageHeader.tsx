import { PageHeader } from "@/brand/components/PageHeader";

// The bar is pinned in an app; `static` sets it in the stage so it can be captured.
export default function PageHeaderPreview() {
  return (
    <>
      <PageHeader className="static" title="Courses" />
      <PageHeader className="static" title="Rounds" subtitle="42 rounds played" />
      <PageHeader
        className="static"
        title="Settings"
        subtitle="A subtitle long enough to run out of room truncates rather than wrapping"
      />
    </>
  );
}
