import { careerFrom } from "../../pages/career/model";
import { sampleAnalyticsAYearOn } from "../fakes/analyticsResponses";
import { sampleGolfer } from "./sampleGolfer";

/** The sample golfer's career, every round. */
export const sampleCareer = careerFrom(sampleGolfer.analytics);

/** The same career ten months on, when the server's last year starts after their March rounds. */
export const laterCareer = careerFrom(sampleAnalyticsAYearOn);
