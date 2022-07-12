/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import ffi from "ffi-napi";
import EventEmitter from "emittery";

const file = join(dirname(fileURLToPath(import.meta.url)), "../dist/", `processMonitor.${process.arch === "x64" ? "x64" : "x86"}.dll`)
             .replace('app.asar', 'app.asar.unpacked'); //electron asar friendly

const lib = ffi.Library(file, {
  createEventSink: ["long", []],
  closeEventSink: ["void", []],
  getInstanceEvent: ["long", ["string"]],
  setCallback: ["void", ["pointer"]]
});

const emitter = new EventEmitter();

const Callback = ffi.Callback("void", new Array(5).fill("string"), (event, ...info) => emitter.emit(event, info));
lib.setCallback(Callback);

// Make an extra reference to the callback pointer to avoid GC
process.on("exit", function () {
  Callback;
}); 

export { lib, emitter };