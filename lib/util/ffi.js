/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

import { arch } from "node:process";
import { join } from "node:path";
import { dlopen, Callback } from "@xan105/ffi/koffi";

const file = join(
  import.meta.dirname,
  "../dist/", 
  `processMonitor.${{ia32: "x86"}[arch] ?? arch}.dll`
).replace("app.asar", "app.asar.unpacked"); //electron asar friendly

const callback = new Callback({
  parameters: ["string", "string", "uint32", "string", "string"]
});

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
    parameters: [callback.type]
  }
}, {
  abi: "stdcall",
  nonblocking: true,
  errorAtRuntime: true
});

export { lib, callback };