import { config } from '../config';
import { logger } from '../logger';
import { ExperimentRunnerDeps } from '../types/service.types';

const MAX_ERROR_LENGTH = 500;

export function createExperimentRunner({ experiments, solve }: ExperimentRunnerDeps) {
  const timers = new Map<string, NodeJS.Timeout>();

  function schedule(runId: string, delayMs: number, task: (runId: string) => Promise<void>): void {
    const existing = timers.get(runId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      timers.delete(runId);
      task(runId).catch((err: unknown) => logger.error({ err, runId }, 'experiment job failed'));
    }, delayMs);
    timer.unref();
    timers.set(runId, timer);
  }

  async function finish(runId: string): Promise<void> {
    const row = await experiments.showById(runId);
    if (!row || row.status !== 'InProgress') return;
    const startedAt = row.timeStart ?? new Date();

    try {
      const outcome = await solve(runId);
      const finishedAt = new Date();
      await experiments.transition(runId, ['InProgress'], {
        status: 'Succeeded',
        timeEnd: finishedAt,
        timeDuration: finishedAt.getTime() - startedAt.getTime(),
        files: outcome.files,
        countReroute: outcome.rerouteCount,
        errorMessage: null,
      });
    } catch (err) {
      logger.error({ err, runId }, 'experiment could not be planned');
      const finishedAt = new Date();
      await experiments.transition(runId, ['InProgress'], {
        status: 'Failed',
        timeEnd: finishedAt,
        timeDuration: finishedAt.getTime() - startedAt.getTime(),
        errorMessage: (err instanceof Error ? err.message : 'planning failed').slice(0, MAX_ERROR_LENGTH),
      });
    }
  }

  async function start(runId: string): Promise<void> {
    const started = await experiments.transition(runId, ['Queued'], {
      status: 'InProgress',
      timeStart: new Date(),
    });
    if (started) schedule(runId, config.solver.runDelayMs, finish);
  }

  return {
    enqueue(runId: string): void {
      schedule(runId, config.solver.queueDelayMs, start);
    },

    cancel(runId: string): void {
      const timer = timers.get(runId);
      if (timer) clearTimeout(timer);
      timers.delete(runId);
    },

    async resumePending(): Promise<number> {
      const pending = await experiments.listPending();
      for (const row of pending) {
        if (row.status === 'Queued') schedule(row.runId, config.solver.queueDelayMs, start);
        else schedule(row.runId, config.solver.runDelayMs, finish);
      }
      return pending.length;
    },
    async runNow(runId: string): Promise<void> {
      this.cancel(runId);
      const started = await experiments.transition(runId, ['Queued'], {
        status: 'InProgress',
        timeStart: new Date(),
      });
      if (started) await finish(runId);
    },

    stop(): void {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}

export type ExperimentRunner = ReturnType<typeof createExperimentRunner>;
