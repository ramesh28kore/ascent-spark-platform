import { z } from "zod";

const uuid = z.string().uuid();
const nullableUuid = z.string().uuid().nullable();

export const batchSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(60),
  academic_year: z.string().trim().min(4).max(20),
  branch: z.string().trim().max(60).nullable(),
  active: z.boolean(),
});

export const studentBatchSchema = z.object({
  student_id: uuid,
  batch_id: nullableUuid,
});

export const sessionSchema = z.object({
  id: uuid.optional(),
  batch_id: nullableUuid,
  module_id: nullableUuid,
  topic_id: nullableUuid,
  trainer_name: z.string().trim().max(120).nullable(),
  title: z.string().trim().min(3).max(160),
  scheduled_at: z.string().min(10).max(40),
  duration_min: z.number().int().min(15).max(600),
  status: z.enum(["planned", "conducted", "cancelled"]),
  notes: z.string().trim().max(1000).nullable(),
});

export const attendanceSchema = z.object({
  session_id: uuid,
  entries: z
    .array(z.object({ student_id: uuid, present: z.boolean() }))
    .min(1)
    .max(500),
});

export const roleSchema = z.object({
  user_id: uuid,
  role: z.enum(["admin", "trainer", "student", "placement"]),
});

export const mockSchema = z.object({
  student_id: uuid,
  rating: z.number().min(0).max(100),
  interviewer: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  held_on: z.string().min(4).max(20),
});

export const practiceProblemSchema = z.object({
  module_id: nullableUuid,
  title: z.string().trim().min(3).max(160),
  platform: z.string().trim().min(2).max(40),
  url: z.string().trim().max(400).nullable(),
  level: z.enum(["easy", "medium", "hard"]),
  points: z.number().int().min(1).max(10),
  sort_order: z.number().int().min(0).max(9999),
});

export const practiceStatusSchema = z.object({
  student_id: uuid,
  problem_id: uuid,
  status: z.enum(["todo", "attempted", "solved"]),
});

export const resourceSchema = z.object({
  module_id: nullableUuid,
  session_id: nullableUuid,
  title: z.string().trim().min(2).max(160),
  kind: z.string().trim().min(2).max(40),
  url: z.string().trim().min(4).max(600),
});

export type AttendanceEntry = z.infer<typeof attendanceSchema>["entries"][number];
