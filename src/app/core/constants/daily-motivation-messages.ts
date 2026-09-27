// Imported from elet-cel-ido-napi-tanulsagok.md; preserve the supplied order and attribution.
import lessons from "../../../assets/daily-lessons.json";

export const DAILY_LESSONS = lessons;
export const DAILY_MOTIVATION_MESSAGES: readonly string[] = lessons.map(lesson => lesson.body);
