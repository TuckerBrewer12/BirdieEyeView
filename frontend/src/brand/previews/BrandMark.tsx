import { BrandMark } from "@/brand/components/BrandMark";

export default function BrandMarkPreview() {
  return (
    <>
      <BrandMark />
      <BrandMark size="sm" />
      <BrandMark iconOnly />
    </>
  );
}
