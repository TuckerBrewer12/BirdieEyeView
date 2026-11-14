import { PageHeader } from "@/brand/components/PageHeader";

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
