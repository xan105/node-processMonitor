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

import { lib, emitter } from "./ffi.js";
import { Failure, ErrorCode } from "./util/error.js";
import { isArrayOfStringNotEmpty } from "./util/helper.js";

function createEventSink(){
    const res = lib.createEventSink();
    if (res !== 0) throw new Failure(ErrorCode[res - 1],"ERR_EVENTSINK_INIT_FAIL");
}

function closeEventSink(){
  lib.closeEventSink();
}

function subscribe(option = {}){
    
  const options = {
    filterWindowsNoise: option.filterWindowsNoise || false,
    filterUsualProgramLocations: option.filterUsualProgramLocations || false,
    creation: option.creation ?? true,
    deletion: option.deletion ?? true,
    filter: isArrayOfStringNotEmpty(option.filter) ? option.filter : [],
    whitelist: option.whitelist || false,
  }; 
    
  createEventSink();

  if (!options.creation && !options.deletion) throw new Failure("You must subscribe to at least one event","ERR_INVALID_ARGS");
  
  const result = lib.getInstanceEvent(
    options.creation, 
    options.deletion, 
    options.filterWindowsNoise, 
    options.filterUsualProgramLocations, 
    options.whitelist, 
    options.filter.toString()
  );

  if (!result) throw new Failure("Unexpected COM interface failure, please check your usage and settings.","ERR_WQL_QUERY_FAIL");

  return emitter;
}

export {
  createEventSink,
  closeEventSink,
  subscribe
};