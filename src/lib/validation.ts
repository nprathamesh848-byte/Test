import { z } from "zod";

export const CLASS_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Bengali",
  "Gujarati",
] as const;

export const emailSchema = z.string().trim().email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your full name.")
  .max(80, "Name is too long.");

export const classLevelSchema = z.coerce
  .number({ message: "Please select your class." })
  .int()
  .min(1, "Class must be between 1 and 10.")
  .max(10, "Class must be between 1 and 10.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password."),
});

export const studentRegisterSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  classLevel: classLevelSchema,
  schoolName: z.string().trim().max(120, "School name is too long.").optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  preferredLanguage: z.string().trim().min(1, "Please choose a language."),
});

export const teacherRegisterSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  schoolName: z.string().trim().max(120, "School name is too long.").optional().or(z.literal("")),
  specialization: z.string().trim().max(120, "Too long.").optional().or(z.literal("")),
});

export const studentProfileSchema = z.object({
  fullName: nameSchema,
  phone: z.string().trim().max(20, "Phone number is too long.").optional().or(z.literal("")),
  classLevel: classLevelSchema,
  schoolName: z.string().trim().max(120).optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  preferredLanguage: z.string().trim().min(1, "Please choose a language."),
});

export const teacherProfileSchema = z.object({
  fullName: nameSchema,
  phone: z.string().trim().max(20, "Phone number is too long.").optional().or(z.literal("")),
  schoolName: z.string().trim().max(120).optional().or(z.literal("")),
  specialization: z.string().trim().max(120).optional().or(z.literal("")),
});

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Runs a zod schema and returns either parsed data or a map of first error per field. */
export function validate<S extends z.ZodTypeAny>(
  schema: S,
  values: unknown,
): { data: z.infer<S>; errors: null } | { data: null; errors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
