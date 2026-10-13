import type { Project } from '../core/model';

export interface ChangeOptions {
  /** Rebuild the input panel (rows added/removed, units changed). */
  structure?: boolean;
  /** data-focus key of the element to focus after a rebuild. */
  focus?: string;
}

type Listener = (project: Project, options: ChangeOptions) => void;

export class Store {
  private listeners = new Set<Listener>();

  constructor(private project: Project) {}

  get(): Project {
    return this.project;
  }

  set(project: Project, options: ChangeOptions = { structure: true }): void {
    this.project = project;
    for (const listener of this.listeners) listener(project, options);
  }

  change(mutate: (draft: Project) => void, options: ChangeOptions = {}): void {
    const draft = structuredClone(this.project);
    mutate(draft);
    this.set(draft, options);
  }

  subscribe(listener: Listener): void {
    this.listeners.add(listener);
  }
}
