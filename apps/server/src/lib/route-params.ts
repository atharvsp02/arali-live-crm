import { z } from "zod";
import { AppError } from "./errors.js";

export function parseUuidParam(value: string | string[] | undefined) {
  const result = z.uuid().safeParse(value);

  if (!result.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "A valid resource ID is required",
    );
  }

  return result.data;
}
