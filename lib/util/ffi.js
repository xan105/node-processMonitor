/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { arch } from "node:process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { dlopen, Callback } from "@xan105/ffi/napi";

const file = join(
  dirname(fileURLToPath(import.meta.url)), 
  "../dist/", 
  `processMonitor.${arch === "x64" ? "x64" : "x86"}.dll`
).replace("app.asar", "app.asar.unpacked"); //electron asar friendly

const callback = new Callback({
  parameters: ["string", "string", "uint32", "string", "string"]
});

const lib = dlopen(file, {
  createEventSink: {
    result: "long",
    nonblocking: true
  },
  closeEventSink: {
    nonblocking: true
  },
  getInstanceEvent: {
    result: "long",
    parameters: ["string"],
    nonblocking: true
  },
  setCallback: {
    parameters: [callback.definition],
    nonblocking: true
  }
}, {
  abi: "stdcall",
  ignoreLoadingFail: true
});

export { lib, callback };