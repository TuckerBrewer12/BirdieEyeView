export interface Hole {
  number: number | null;
  par: number | null;
  handicap: number | null;
}

export interface Tee {
  color: string | null;
  total_yardage: number | null;
  hole_yardages: Record<number, number>;
  slope_rating: number | null;
  course_rating: number | null;
}

export interface Course {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
  holes: Hole[];
  tees: Tee[];
}

export interface HoleScore {
  hole_number: number | null;
  strokes: number | null;
  net_score: number | null;
  putts: number | null;
  shots_to_green: number | null;
  fairway_hit: boolean | null;
  green_in_regulation: boolean | null;
  par_played: number | null;
  handicap_played: number | null;
}

export interface Round {
  id: string | null;
  course: Course | null;
  tee_box: string | null;
  date: string | null;
  hole_scores: HoleScore[];
  weather_conditions: string | null;
  notes: string | null;
  total_putts: number | null;
  total_gir: number | null;
  course_name_played: string | null;
  user_tee: UserTee | null;
}

export interface RoundSummary {
  id: string;
  course_id: string | null;
  course_name: string | null;
  course_location: string | null;
  course_par: number | null;
  tee_box: string | null;
  date: string | null;
  total_score: number | null;
  to_par: number | null;
  front_nine: number | null;
  back_nine: number | null;
  total_putts: number | null;
  total_gir: number | null;
  fairways_hit: number | null;
  notes: string | null;
  hole_scores_summary?: Array<{ h: number; s: number | null; p: number | null }> | null;
}

export interface DashboardData {
  total_rounds: number;
  scoring_average: number | null;
  best_round: number | null;
  best_round_id: string | null;
  best_round_course: string | null;
  handicap_index: number | null;
  recent_rounds: RoundSummary[];
  average_putts: number | null;
  average_gir: number | null;
}

export interface Milestone {
  type: "score_break" | "gir_break" | "putt_break" | "eagle" | "hole_in_one" | "under_par" | "par_streak" | "birdie_streak";
  label: string;
  date: string; // "YYYY/M/D"
  course: string;
  round_id?: string | null;
}

export interface CourseSummary {
  id: string;
  name: string | null;
  external_course_id?: string | null;
  source?: "local" | "external";
  location: string | null;
  par: number | null;
  total_holes: number;
  tee_count: number;
}

export interface UserTee {
  id: string | null;
  name: string | null;
  slope_rating: number | null;
  course_rating: number | null;
  hole_yardages: Record<number, number>;
}

export interface User {
  id: string | null;
  friend_code?: string | null;
  name: string | null;
  email: string | null;
  home_course_id: string | null;
  handicap: number | null;
  created_at: string | null;
  scoring_goal?: number | null;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string;
  requester_name?: string | null;
  requester_email?: string | null;
  addressee_name?: string | null;
  addressee_email?: string | null;
}
