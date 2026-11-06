import { Button } from "@/brand/components/Button";

export default function ButtonPreview() {
  return (
    <>
      <Button variant="primary">Save</Button>
      <Button>Load more</Button>
      <Button block>Load more (12 remaining)</Button>
      <Button disabled>Disabled</Button>
    </>
  );
}
