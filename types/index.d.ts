declare interface IOption {
  filterWindowsNoise?: boolean,
  filterUsualProgramLocations?: boolean,
  creation?: boolean,
  deletion?: boolean,
  filter?: string[],
  whitelist?: boolean
}

export function createEventSink(): void
export function closeEventSink(): void
export function subscribe(option?: IOption): any

export * as promises from "./promises.d.ts"