/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { promisify } from "node:util";
import { Failure } from "@xan105/error";
import { asBoolean, asArrayOfStringNotEmpty } from "@xan105/is/opt";
import { querify } from "./util/wql.js";
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
    creation: asBoolean(option.creation) ?? true,
    deletion: asBoolean(option.deletion) ?? true,
    dir: {
      filter: asArrayOfStringNotEmpty(option.dir?.filter) ?? [],
      whitelist: asBoolean(option.dir?.whitelist) ?? false
    },
    bin:{
      filter: asArrayOfStringNotEmpty(option.bin?.filter) ?? [],
      whitelist: asBoolean(option.bin?.whitelist) ?? false
    }
  };
  
  if (!options.creation && !options.deletion) 
    throw new Failure("You must subscribe to at least one event", "ERR_INVALID_ARG");
  await createEventSink();
  
  const query = querify(options);
  
  const result = await promisify(lib.getInstanceEvent.async)(query);
  if (!result) throw new Failure("Unexpected COM interface failure, please check your usage and settings.", { code:"ERR_WQL_QUERY_FAIL", info: { query } });
  
  return emitter;
}

export {
  createEventSink,
  closeEventSink,
  subscribe
};