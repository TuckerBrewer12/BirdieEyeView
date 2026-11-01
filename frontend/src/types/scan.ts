export interface ExtractedHoleScore {
  hole_number: number | null;
  strokes: number | null;
  putts: number | null;
  shots_to_green: number | null;
  fairway_hit: boolean | null;
  green_in_regulation: boolean | null;
}

export interface ExtractedRound {
  course: {
    name: string | null;
    location: string | null;
    par: number | null;
    holes: { number: number | null; par: number | null; handicap: number | null }[];
    tees: { color: string | null; slope_rating: number | null; course_rating: number | null; hole_yardages: Record<string, number> }[];
  } | null;
  tee_box: string | null;
  date: string | null;
  hole_scores: ExtractedHoleScore[];
  notes: string | null;
}

export interface FieldConfidence {
  final_confidence: number;
  level: string;
  validation_flags: string[];
}

interface HoleConfidence {
  hole_number: number;
  fields: Partial<Record<string, FieldConfidence>>;
  overall: number;
  level: string;
}

export interface ScanResult {
  round: ExtractedRound;
  confidence: {
    overall: number;
    level: string;
    hole_scores: HoleConfidence[];
  };
  fields_needing_review: string[];
}

export interface ManualTee {
  color: string | null;
  slope_rating: number | null;
  course_rating: number | null;
  hole_yardages: Record<string, number>;
}
