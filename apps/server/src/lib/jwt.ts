import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAuthToken(userId: string) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid authentication token");
  }

  return payload.sub;
}
