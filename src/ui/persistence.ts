import type { Project } from '../core/model';
import { decodeShare, encodeShare, fromJSON, toJSON } from '../core/serialize';

const STORAGE_KEY = 'cutlist:project';
const SHARE_PREFIX = '#p=';
const MAX_IMPORT_BYTES = 1_000_000;

export function loadLocal(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? fromJSON(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocal(project: Project): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, toJSON(project));
    return true;
  } catch {
    return false;
  }
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cutlist';

export function downloadProject(project: Project): void {
  const url = URL.createObjectURL(new Blob([toJSON(project)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(project.name)}.cutlist.json`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProjectFile(file: File): Promise<Project> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('File too large');
  return fromJSON(await file.text());
}

export function shareUrl(project: Project): string {
  const url = new URL(window.location.href);
  url.hash = SHARE_PREFIX.slice(1) + encodeShare(project);
  return url.toString();
}

/** Reads a shared project from the URL and removes it from the address bar. */
export function takeSharedProject(): Project | null {
  if (!window.location.hash.startsWith(SHARE_PREFIX)) return null;
  const project = decodeShare(window.location.hash.slice(SHARE_PREFIX.length));
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return project;
}
