import { scenarioDef } from "./scenarios";
import { SCN_SCHOOL } from "./scenariosA";
import { SCN_WORK } from "./scenariosB";
import { SCN_HOME } from "./scenariosC";
import { SCN_LIFE } from "./scenariosD";

export const SCENARIO_EVENTS = [...SCN_SCHOOL, ...SCN_WORK, ...SCN_HOME, ...SCN_LIFE].map(scenarioDef);
