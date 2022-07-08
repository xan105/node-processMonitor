/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import ffi from "ffi-napi";
import EventEmitter from "emittery";
import { Failure } from "@xan105/error";

const file = join(dirname(fileURLToPath(import.meta.url)), "../dist/", `processMonitor.${process.arch === "x64" ? "x64" : "x86"}.dll`)
             .replace('app.asar', 'app.asar.unpacked'); //electron asar friendly

const lib = ffi.Library(file, {
  createEventSink: ["long", []],
  closeEventSink: ["void", []],
  getInstanceEvent: ["long", ["string"]],
  setCallback: ["void", ["pointer"]]
});

const emitter = new EventEmitter();

const Callback = ffi.Callback("void", ["string", "string", "string", "string", "string"], 
  function (event, process, pid, filepath, user) {
    if (event === "creation") {
      emitter.emit("creation", [process, pid, filepath, user]);
    } else if (event === "deletion") {
      emitter.emit("deletion", [process, pid]);
    } else {
      throw new Failure(`Unknown event "${event}"`,"ERR_UNEXPECTED_EVENT");
    }
});
lib.setCallback(Callback);

// Make an extra reference to the callback pointer to avoid GC
process.on("exit", function () {
  Callback;
}); 

export { lib, emitter };