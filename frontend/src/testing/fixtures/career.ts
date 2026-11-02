import { careerFrom } from "../../pages/career/model";
import { sampleGolfer } from "./sampleGolfer";

/** A few days after the sample golfer's last round, as the analytics and dashboard robots see them. */
export const CAREER_TODAY = new Date("2026-06-02T18:00:00.000Z");

/**
 * Ten months on: the last year then starts after the sample golfer's first rounds, so some of
 * their putting and GIR milestones fall outside it.
 */
export const CAREER_LATER = new Date("2027-04-01T18:00:00.000Z");

/** The sample golfer's career, every round. */
export const sampleCareer = careerFrom(sampleGolfer.analytics, CAREER_TODAY);

/** The same career seen ten months on. */
export const laterCareer = careerFrom(sampleGolfer.analytics, CAREER_LATER);
