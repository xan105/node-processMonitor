declare interface IOption {
  filterWindowsNoise?: boolean,
  filterUsualProgramLocations?: boolean,
  creation?: boolean,
  deletion?: boolean,
  filter?: string[],
  whitelist?: boolean
}

export function createEventSink(): Promise<void>
export function closeEventSink(): Promise<void>
export function subscribe(option?: IOption): Promise<any>