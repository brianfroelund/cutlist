import type { Project } from '../core/model';
import { optimize } from '../core/optimize';

interface Request {
  id: number;
  project: Project;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = (event) => {
  const { id, project } = event.data;
  scope.postMessage({ id, result: optimize(project) });
};
