import { PageTitle } from "@/brand/components/PageTitle";

export default function PageTitlePreview() {
  return (
    <>
      <PageTitle size="compact">Compact</PageTitle>
      <PageTitle>Default</PageTitle>
      <PageTitle size="lg">Large</PageTitle>
    </>
  );
}
