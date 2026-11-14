import { PageTitle } from "@/brand/components/PageTitle";

export default function PageTitlePreview() {
  return (
    <>
      <PageTitle size="compact">Compact</PageTitle>
      <PageTitle>Default</PageTitle>
      <PageTitle size="lg">Large</PageTitle>
      <PageTitle size="heading">Half Moon Bay</PageTitle>
      <PageTitle size="figure">Tucker</PageTitle>
      <PageTitle size="display">Scan your scorecard.</PageTitle>
    </>
  );
}
