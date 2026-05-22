import * as core from '@actions/core';
import { readWorkflowInput } from '@bridgedai/actions-core';
import { ConfigurationError } from './errors';

export function readInput(name: string): string {
  const fromCore = String(core.getInput(name) ?? '').trim();
  if (fromCore) return fromCore;
  return readWorkflowInput(name);
}

export function getOptionalInput(name: string): string {
  return readInput(name);
}

export function maskSecret(value: string): void {
  const v = String(value ?? '').trim();
  if (!v) return;
  core.setSecret(v);
}

export function fail(message: string | Error): never {
  const m = message instanceof Error ? message.message : message;
  core.setFailed(m);
  throw message instanceof Error ? message : new Error(m);
}
