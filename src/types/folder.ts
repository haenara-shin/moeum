import { z } from 'zod';

export const FolderSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, '폴더 이름을 입력해주세요').max(40, '40자 이내'),
  color: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  created_at: z.number().int().optional(),
  updated_at: z.number().int().optional(),
});

export type Folder = z.infer<typeof FolderSchema>;

export type FolderInput = Pick<Folder, 'name' | 'color'>;
