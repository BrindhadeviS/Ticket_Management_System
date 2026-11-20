import { randomInt } from "crypto";

// Example: Temp@483920
export const makeTempPassword = () => `Temp@${randomInt(100000, 1000000)}`;