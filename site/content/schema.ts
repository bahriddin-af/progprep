import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const topicSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  hot: z.boolean(),
  lesson: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export const stageSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  topics: z.array(topicSchema).min(1),
});

export const roadmapSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  stages: z.array(stageSchema).min(1),
});

export type Question = z.infer<typeof questionSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
