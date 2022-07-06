/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { Failure, windowsErrCodesWMI } from "@xan105/error";
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