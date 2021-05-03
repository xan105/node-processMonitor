//ES Module Wrapper
//https://nodejs.org/api/esm.html#esm_dual_commonjs_es_module_packages

import module from "./processMonitor.cjs";
const createEventSink = module.createEventSink;
const closeEventSink = module.closeEventSink;
const subscribe = module.subscribe;
const promises = module.promises;
export { promises, createEventSink, closeEventSink, subscribe };
