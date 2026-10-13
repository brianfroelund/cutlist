import type { Project } from './model';
import { mm } from './units';

export type IssueCode = 'kerf-large' | 'no-stock' | 'planing-too-short';

export interface Issue {
  code: IssueCode;
  materialId?: string;
}

export const MAX_SENSIBLE_KERF = mm(20);

export function validateProject(project: Project): Issue[] {
  const issues: Issue[] = [];
  if (project.kerf > MAX_SENSIBLE_KERF) issues.push({ code: 'kerf-large' });
  for (const m of project.materials) {
    const needsStock = m.parts.some((p) => p.length > 0 && p.quantity > 0);
    if (needsStock && !m.stock.some((s) => s.length > 0 && s.quantity !== 0)) {
      issues.push({ code: 'no-stock', materialId: m.id });
    }
    if (m.planingLength !== null && m.planingLength <= 2 * m.trimPerEnd) {
      issues.push({ code: 'planing-too-short', materialId: m.id });
    }
  }
  return issues;
}
