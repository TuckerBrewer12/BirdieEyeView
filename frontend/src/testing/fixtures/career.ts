import { careerFrom } from "../../pages/career/model";
import { sampleAnalyticsAYearOn } from "../fakes/analyticsResponses";
import { sampleGolfer } from "./sampleGolfer";

export const sampleCareer = careerFrom(sampleGolfer.analytics);

export const laterCareer = careerFrom(sampleAnalyticsAYearOn);
