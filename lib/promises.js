/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { promisify } from "node:util";
import { Failure, windowsErrCodesWMI } from "@xan105/error";
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

async function subscribe(options){
  
  const query = querify(options);
  
  await createEventSink();
  
  const hres = await promisify(lib.getInstanceEvent.async)(query);
  if (hres < 0) {
    const code = hres + 4294967296; //negative to positive
    throw new Failure(windowsErrCodesWMI[code]?.[0] ?? `Error ${code} (0x${code.toString(16).toUpperCase()})`, 
    { 
      code: windowsErrCodesWMI[code]?.[1] ?? null, 
      info: { query } 
    });
  }
  
  return emitter;
}

export {
  createEventSink,
  closeEventSink,
  subscribe
};