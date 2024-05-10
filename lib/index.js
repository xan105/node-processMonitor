/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import EventEmitter from "emittery";
import { Failure, errorLookup} from "@xan105/error";
import { shouldObj, shouldFunction } from "@xan105/is/assert";
import { asBoolean, asArrayOfStringNotEmpty } from "@xan105/is/opt";
import { querify } from "./util/wql.js";
import { lib, callback } from "./util/ffi.js";

const emitter = new EventEmitter();

async function createEventSink() {
  const hres = await lib.createEventSink();
  if (hres < 0) throw new Failure(...errorLookup(hres, "hresult"));
}

async function closeEventSink(){
  await lib.closeEventSink();
  emitter.clearListeners();
}

async function updateCallback(cb){
  shouldFunction(cb);
  callback.register(cb);
  await lib.setCallback(callback.pointer);
}

async function subscribe(option = {}){
  
  shouldObj(option);
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

  await createEventSink();
  await updateCallback((event, ...info) => emitter.emit(event, info));
  
  const query = querify(options);
  const hres = await lib.getInstanceEvent(query);
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