declare interface IOption {
  filterWindowsNoise?: bool,
  filterUsualProgramLocations?: bool,
  creation?: bool,
  deletion?: bool,
  filter?: string[],
  whitelist?: bool
}

export function createEventSink(): void
export function closeEventSink(): void
export function subscribe(option?: IOption): any

export * as promises from "./promises.d.ts"