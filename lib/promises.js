/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { promisify } from "node:util";
import { Failure, errorLookup} from "@xan105/error";
import { querify } from "./util/wql.js";
import { lib, emitter } from "./util/ffi.js";

async function createEventSink() {
  const hres = await promisify(lib.createEventSink.async)();
  if (hres < 0) throw new Failure(...errorLookup(hres));
}

async function closeEventSink(){
  await promisify(lib.closeEventSink.async)();
}

async function subscribe(options){
  
  const query = querify(options);
  
  await createEventSink();
  
  const hres = await promisify(lib.getInstanceEvent.async)(query);
  if (hres < 0) {
    const [ message, code ] = errorLookup(hres);
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