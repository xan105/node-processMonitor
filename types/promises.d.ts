declare interface IOption {
  filterWindowsNoise?: bool,
  filterUsualProgramLocations?: bool,
  creation?: bool,
  deletion?: bool,
  filter?: string[],
  whitelist?: bool
}

export function createEventSink(): Promise<void>
export function closeEventSink(): Promise<void>
export function subscribe(option?: IOption): Promise<any>