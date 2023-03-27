/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { dlopen, Callback } from "@xan105/ffi/napi";
import EventEmitter from "emittery";

const file = join(
  dirname(fileURLToPath(import.meta.url)), 
  "../dist/", 
  `processMonitor.${process.arch === "x64" ? "x64" : "x86"}.dll`
).replace("app.asar", "app.asar.unpacked"); //electron asar friendly

const emitter = new EventEmitter();

const callback = new Callback({
  parameters: ["string", "string", "uint32", "string", "string"]
}, 
  (event, ...info) => emitter.emit(event, info)
);

const lib = dlopen(file, {
  createEventSink: {
    result: "long"
  },
  closeEventSink: {},
  getInstanceEvent: {
    result: "long",
    parameters: ["string"]
  },
  setCallback: {
    parameters: [callback.definition]
  }
});

lib.setCallback(callback.pointer);

export { lib, emitter };