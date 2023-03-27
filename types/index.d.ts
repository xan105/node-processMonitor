declare interface Filter {
  filter?: string[],
  whitelist?: boolean
}

declare interface Option {
  creation?: boolean,
  deletion?: boolean,
  dir?: Filter
  bin?: Filter
}

export function createEventSink(): void
export function closeEventSink(): void
export function subscribe(option?: Option): any

export * as promises from "./promises.d.ts"