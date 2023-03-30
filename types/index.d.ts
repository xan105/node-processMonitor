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

export function createEventSink(): Promise<void>
export function closeEventSink(): Promise<void>
export function subscribe(option?: Option): Promise<EventEmitter<Record<PropertyKey, any>, Record<PropertyKey, any> & import("emittery").OmnipresentEventData, import("emittery").DatalessEventNames<Record<PropertyKey, any>>>>;
import EventEmitter from "emittery";
