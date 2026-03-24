import bcrypt from "bcryptjs";
import { BCRYPT_COST_FACTOR } from "@/lib/constants";

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}
