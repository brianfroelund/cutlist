import type { Project } from '../core/model';
import { decodeShare, fromJSON, toJSON } from '../core/serialize';
import { decodeCompact, encodeCompact } from '../core/share';

const STORAGE_KEY = 'cutlist:project';
/** Compact links; the payload is QR-alphanumeric so print QR codes stay small. */
const SHARE_PREFIX = '#Q';
const LEGACY_SHARE_PREFIX = '#p=';
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
  url.hash = SHARE_PREFIX.slice(1) + encodeCompact(project);
  return url.toString();
}

/** Splits a share URL into a byte part and the QR-alphanumeric part after "#". */
export function splitShareUrl(url: string): [string, string] {
  const i = url.indexOf('#');
  return [url.slice(0, i + 1), url.slice(i + 1)];
}

/** Reads a shared project from the URL and removes it from the address bar. */
export function takeSharedProject(): Project | null {
  const hash = window.location.hash;
  let project: Project | null;
  if (hash.startsWith(SHARE_PREFIX)) project = decodeCompact(hash.slice(SHARE_PREFIX.length));
  else if (hash.startsWith(LEGACY_SHARE_PREFIX))
    project = decodeShare(hash.slice(LEGACY_SHARE_PREFIX.length));
  else return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return project;
}
