import { FilterChip, FilterChipRow } from "@/brand/components/FilterChip";

export default function FilterChipPreview() {
  return (
    <FilterChipRow>
      <FilterChip label="All" active onClick={() => {}} />
      <FilterChip label="L20" active={false} onClick={() => {}} />
      <FilterChip label="Best" active={false} onClick={() => {}} />
      <FilterChip label="Half Moon Bay" active={false} onClick={() => {}} />
    </FilterChipRow>
  );
}
