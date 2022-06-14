/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { promisify } from "node:util";
import { Failure } from "@xan105/error";
import { asBoolean, asArrayOfStringNotEmpty } from "@xan105/is/opt";
import { lib, emitter } from "./util/ffi.js";
import { ErrorCodes } from "./util/error.js";

async function createEventSink() {
  const res = await promisify(lib.createEventSink.async)();
  if (res !== 0) throw new Failure(ErrorCodes[res], "ERR_EVENTSINK_INIT_FAIL");
}

async function closeEventSink(){
  await promisify(lib.closeEventSink.async)();
}

async function subscribe(option = {}){
    
  const options = {
    filterWindowsNoise: asBoolean(option.filterWindowsNoise) ?? false,
    filterUsualProgramLocations: asBoolean(option.filterUsualProgramLocations) ?? false,
    creation: asBoolean(option.creation) ?? true,
    deletion: asBoolean(option.deletion) ?? true,
    filter: asArrayOfStringNotEmpty(option.filter) ?? [],
    whitelist: asBoolean(option.whitelist) ?? false
  }; 
    
  await createEventSink();

  if (!options.creation && !options.deletion) throw new Failure("You must subscribe to at least one event", "ERR_INVALID_ARG");
  
  const result = await promisify(lib.getInstanceEvent.async)(
    options.creation, 
    options.deletion, 
    options.filterWindowsNoise, 
    options.filterUsualProgramLocations, 
    options.whitelist, 
    options.filter.toString()
  );

  if (!result) throw new Failure("Unexpected COM interface failure, please check your usage and settings.", "ERR_WQL_QUERY_FAIL");

  return emitter;
}

export {
  createEventSink,
  closeEventSink,
  subscribe
};