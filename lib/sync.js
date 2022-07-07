/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { Failure, windowsErrCodesHRESULT } from "@xan105/error";
import { querify } from "./util/wql.js";
import { lib, emitter } from "./util/ffi.js";
import { ErrorCodes } from "./util/error.js";

function createEventSink(){
  const res = lib.createEventSink();
  if (res !== 0) throw new Failure(ErrorCodes[res], "ERR_EVENTSINK_INIT_FAIL");
}

function closeEventSink(){
  lib.closeEventSink();
}

function subscribe(options){
  
  const query = querify(options);
  
  createEventSink();
  
  const hres = lib.getInstanceEvent(query);
  if (hres < 0) {
    const code = new Uint32Array([hres])[0] //cast signed to unsigned
    throw new Failure(windowsErrCodesHRESULT[code]?.[0] ?? `Error ${code} (0x${code.toString(16).toUpperCase()})`, 
    { 
      code: windowsErrCodesHRESULT[code]?.[1] ?? null, 
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