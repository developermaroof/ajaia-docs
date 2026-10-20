import { z } from "zod";
import { MAX_CONTENT_BYTES, MAX_TITLE_LENGTH, utf8ByteLength } from "./limits";

export const idSchema = z.guid();

const titleSchema = z
  .string({
    error: (issue) => (issue.input === undefined ? "title is required" : "title must be a string"),
  })
  .trim()
  .min(1, "Title cannot be empty")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`);

const contentSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined ? "content is required" : "content must be a string of HTML",
  })
  .refine((html) => utf8ByteLength(html) <= MAX_CONTENT_BYTES, {
    error: "Document is larger than the 1 MB limit",
    params: { status: 413 },
  });

const expectedVersionSchema = z
  .int({
    error: (issue) =>
      issue.input === undefined
        ? "expectedVersion is required when saving content"
        : "expectedVersion must be a whole number",
  })
  .min(1, "expectedVersion must be 1 or greater");

export const loginSchema = z.strictObject({
  userId: z.guid({
    error: (issue) =>
      issue.input === undefined ? "userId is required" : "userId must be a user id (UUID)",
  }),
});

export const createDocumentSchema = z.strictObject({
  title: titleSchema.optional(),
});

const renamePatchSchema = z
  .strictObject({ title: titleSchema })
  .transform(({ title }) => ({ kind: "title" as const, title }));

const contentPatchSchema = z
  .strictObject({ content: contentSchema, expectedVersion: expectedVersionSchema })
  .transform(({ content, expectedVersion }) => ({
    kind: "content" as const,
    content,
    expectedVersion,
  }));

export type DocumentPatch = z.output<typeof renamePatchSchema> | z.output<typeof contentPatchSchema>;

export type ValidationFailure = {
  ok: false;
  status: 400 | 413;
  error: string;
  details: { path: string; message: string }[];
};

export type ValidationResult<T> = { ok: true; data: T } | ValidationFailure;

export function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const details = result.error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(body)",
    message: issue.message,
  }));
  const tooLarge = result.error.issues.some(
    (issue) => issue.code === "custom" && issue.params?.status === 413,
  );
  return { ok: false, status: tooLarge ? 413 : 400, error: details[0].message, details };
}

function failure(error: string): ValidationFailure {
  return { ok: false, status: 400, error, details: [{ path: "(body)", message: error }] };
}

// A rename and a content save are separate requests (only content is version-checked),
// so pick the schema from the keys that were sent. This keeps error messages specific.
export function parseDocumentPatch(body: unknown): ValidationResult<DocumentPatch> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return failure("Request body must be a JSON object");
  }
  const renaming = "title" in body;
  const saving = "content" in body || "expectedVersion" in body;
  if (renaming && saving) {
    return failure(
      "Rename and content saves are separate requests: send either { title } or { content, expectedVersion }",
    );
  }
  if (!renaming && !saving) {
    return failure("Send either { title } to rename, or { content, expectedVersion } to save content");
  }
  return renaming ? validate(renamePatchSchema, body) : validate(contentPatchSchema, body);
}
