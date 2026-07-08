import os from 'node:os';
import { join, resolve, sep } from 'node:path';

/** Root where FlowStudio renders/handoffs live (mirrors the edit module). */
export function studioRoot(): string {
  return process.env.FLOWSTUDIO_ROOT || join(os.homedir(), 'FlowStudio');
}
export function projectsRoot(): string {
  return join(studioRoot(), '20_projects');
}
/** Where job JSON configs live (relative to the app cwd). */
export function jobsDir(): string {
  return join(process.cwd(), 'src', 'modules', 'edit', 'jobs');
}

/** Guard against path traversal — only allow paths inside the studio root. */
export function safeUnderStudio(p: string): string | null {
  const r = resolve(p);
  const root = resolve(studioRoot());
  return r === root || r.startsWith(root + sep) ? r : null;
}

/** Slug + project-dir naming — MUST match the edit pipeline's scheme. */
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const projectName = (author: string, title: string) => `${slug(author)}--${slug(title)}`;
