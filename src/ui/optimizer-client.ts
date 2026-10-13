import type { Project } from '../core/model';
import { optimize, type OptimizeResult } from '../core/optimize';

interface Response {
  id: number;
  result: OptimizeResult;
}

/** Runs the optimizer in a Web Worker so typing never stutters; only the newest request is rendered. */
export class OptimizerClient {
  private worker: Worker | null = null;
  private latest = 0;
  private projects = new Map<number, Project>();

  constructor(
    private onResult: (result: OptimizeResult, project: Project) => void,
    private onBusy: (busy: boolean) => void,
  ) {
    try {
      this.worker = new Worker(new URL('../worker/optimizer.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.addEventListener('message', (e: MessageEvent<Response>) =>
        this.receive(e.data.id, e.data.result),
      );
      this.worker.addEventListener('error', () => {
        this.worker = null;
        const project = this.projects.get(this.latest);
        if (project) this.receive(this.latest, optimize(project));
      });
    } catch {
      this.worker = null;
    }
  }

  run(project: Project): void {
    const id = ++this.latest;
    this.projects.set(id, project);
    this.onBusy(true);
    if (this.worker) this.worker.postMessage({ id, project });
    else this.receive(id, optimize(project));
  }

  private receive(id: number, result: OptimizeResult): void {
    const project = this.projects.get(id);
    this.projects.delete(id);
    if (id !== this.latest || !project) return;
    this.onBusy(false);
    this.onResult(result, project);
  }
}
