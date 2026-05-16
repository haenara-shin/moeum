import { z } from 'zod';

export const QuoteSchema = z.object({
  id: z.number().int().positive().optional(),
  body: z.string().min(1, '문장을 입력해주세요').max(2000, '2000자 이내로 입력해주세요'),
  author: z.string().max(100).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  original_image_path: z.string().optional().nullable(),
  folder_id: z.number().int().nullable().optional(),
  created_at: z.number().int().optional(),
  updated_at: z.number().int().optional(),
});

export type Quote = z.infer<typeof QuoteSchema>;

export const QuoteInputSchema = QuoteSchema.pick({
  body: true,
  author: true,
  source: true,
  original_image_path: true,
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

export type WidgetSnapshot = {
  version: 1;
  generated_at: number;
  items: Array<Pick<Quote, 'id' | 'body' | 'author' | 'source'>>;
};
