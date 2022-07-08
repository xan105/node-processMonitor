/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { Failure, windowsErrCodesHRESULT } from "@xan105/error";
import { querify } from "./util/wql.js";
import { lib, emitter } from "./util/ffi.js";

function createEventSink(){
  const hres = lib.createEventSink();
  if (hres < 0) {
    const code = new Uint32Array([hres])[0] //cast signed to unsigned
    throw new Failure(...windowsErrCodesHRESULT[code] ?? [`Error ${code} (0x${code.toString(16).toUpperCase()})`]);
  }
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
      code: windowsErrCodesHRESULT[code]?.[1], 
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