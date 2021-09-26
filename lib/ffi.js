/*
MIT License

Copyright (c) 2020-2021 Anthony Beaumont

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import ffi from "ffi-napi";
import EventEmitter from "emittery";
import { Failure } from "./util/error.js";

const file = join(dirname(fileURLToPath(import.meta.url)), "/dist/", `processMonitor.${process.arch === "x64" ? "x64" : "x86"}.dll`)
             .replace('app.asar', 'app.asar.unpacked'); //electron asar friendly

const lib = ffi.Library(file, {
  createEventSink: ["int", []],
  closeEventSink: ["void", []],
  getInstanceEvent: ["bool", ["bool", "bool", "bool", "bool", "bool", "string"]],
  setCallback: ["void", ["pointer"]]
});

const emitter = new EventEmitter();

const Callback = ffi.Callback("void",["string", "string", "string", "string"],
  function (event, process, pid, filepath) {
    if (event === "creation") {
      emitter.emit("creation", [process, pid, filepath]);
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