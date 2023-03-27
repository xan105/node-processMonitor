/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { Failure, errorLookup } from "@xan105/error";
import { querify } from "./util/wql.js";
import { lib, emitter } from "./util/ffi.js";

function createEventSink(){
  const hres = lib.createEventSink();
  if (hres < 0) 
    throw new Failure(...errorLookup(hres, "hresult"));
}

function closeEventSink(){
  lib.closeEventSink();
}

function subscribe(options){
  
  const query = querify(options);
  
  createEventSink();
  
  const hres = lib.getInstanceEvent(query);
  if (hres < 0) {
    const [ message, code ] = errorLookup(hres, "hresult");
    throw new Failure(message, {
      code, 
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