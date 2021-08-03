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

"use strict";

const path = require("path");
const EventEmitter = require("emittery");
const ffi = require("ffi-napi");
const { Failure } = require("./util/error.cjs");

const lib = ffi.Library(
  path.join(__dirname, "dist", `processMonitor.${process.arch === "x64" ? "x64" : "x86"}.dll`),
  {
    createEventSink: ["int", []],
    closeEventSink: ["void", []],
    getInstanceOperationEvent: ["bool", ["bool", "bool", "bool", "string"]],
    getInstanceCreationEvent: ["bool", ["bool", "bool", "bool", "string"]],
    getInstanceDeletionEvent: ["bool", ["bool", "bool", "bool", "string"]],
    setCallback: ["void", ["pointer"]],
    getError: ["string", []]
  }
);

const emitter = new EventEmitter();

const Callback = ffi.Callback(
  "void",
  ["string", "string", "string", "string"],
  function (event, process, pid, filepath) {
    if (event === "creation") {
      emitter.emit("creation", [process, pid, filepath]);
    } else if (event === "deletion") {
      emitter.emit("deletion", [process, pid]);
    } else {
      throw new Failure(`Unknow event "${event}"`,"ERR_UNEXPECTED_EVENT");
    }
  }
);
lib.setCallback(Callback);

const ErrorCode = [
  "Unknown error (failed to obtain any available information from the COM interface)",
  "COM library for the calling thread already initialized by 3rd party with different threading model. This lib requires 'COINIT_MULTITHREADED'",
  "Failed to initialize COM library for the calling thread",
  "Failed to initialize security",
  "Failed to create IWbemLocator object",
  "Could not connect to ROOT\\CIMV2 WMI namespace",
  "Could not set proxy blanket"
];

const WQL = {
  promises: {
    createEventSink: function () {
      return new Promise((resolve, reject) => {
        lib.createEventSink.async(function (err, res) {
          if (err) { //Calling the lib went wrong
            return reject(err);
          } else if (res === 0) { //Success
            return resolve();
          } else { //Error message
            return reject(new Failure(ErrorCode[res],"ERR_EVENTSINK_INIT_FAIL"));
          }
        });
      });
    },
    closeEventSink: function () {
      return new Promise((resolve, reject) => {
        lib.closeEventSink.async(function (err) {
          if (err) { //Calling the lib went wrong
            return reject(err);
          } else { //Success
            return resolve();
          }
        });
      });
    },
    subscribe: function (option = {}) {
      return new Promise((resolve, reject) => {
        const options = {
          filterWindowsNoise: option.filterWindowsNoise || false,
          filterUsualProgramLocations: option.filterUsualProgramLocations || false,
          creation: option.creation != null ? option.creation : true,
          deletion: option.deletion != null ? option.deletion : true,
          filter: option.filter && Array.isArray(option.filter) ? option.filter : [],
          whitelist: option.whitelist || false,
        };

        this.createEventSink()
        .then(()=>{
        
          const param = [
            options.filterWindowsNoise,
            options.filterUsualProgramLocations,
            options.whitelist,
            options.filter.toString(),
            function (err, res) {
              if (err) { //Calling the lib went wrong
                return reject(err);
              } else if (res === true) { //Success
                return resolve(emitter);
              } else { //Error
                lib.getError.async(function(err,res){ //Try to get the com interface error
                  if (err) { //Calling the lib went wrong
                    return reject(new Failure("Unknown error","ERR_WQL_QUERY_FAIL")); 
                  } else if (res === "") { //Empty message
                    return reject(new Failure(ErrorCode[0],"ERR_WQL_QUERY_FAIL")); 
                  } else { //Message
                    return reject(new Failure(res,"ERR_WQL_QUERY_FAIL"));
                  }
                }); 
              }
            }
          ];
          
          if (options.creation && options.deletion) {
            lib.getInstanceOperationEvent.async(...param);
          } else if (options.creation) {
            lib.getInstanceCreationEvent.async(...param);
          } else if (options.deletion) {
            lib.getInstanceDeletionEvent.async(...param);
          } else {
            return reject(new Failure("You must subscribe to at least one event","ERR_INVALID_ARGS"));
          }
        
        }).catch((err)=>{
          return reject(err);
        });
      });
    },
  }, //Sync
  createEventSink: function () {
    const res = lib.createEventSink();
    if (res !== 0) throw new Failure(ErrorCode[res],"ERR_EVENTSINK_INIT_FAIL");
  },
  closeEventSink: function () {
    lib.closeEventSink();
  },
  subscribe: function (option = {}) {
    const options = {
      filterWindowsNoise: option.filterWindowsNoise || false,
      filterUsualProgramLocations: option.filterUsualProgramLocations || false,
      creation: option.creation != null ? option.creation : true,
      deletion: option.deletion != null ? option.deletion : true,
      filter: option.filter && Array.isArray(option.filter) ? option.filter : [],
      whitelist: option.whitelist || false,
    };
    
    this.createEventSink();
    
    const param = [
      options.filterWindowsNoise,
      options.filterUsualProgramLocations,
      options.whitelist,
      options.filter.toString()
    ];
    
    let result;
    
    if (options.creation && options.deletion) {
      result = lib.getInstanceOperationEvent(...param);
    } else if (options.creation) {
      result = lib.getInstanceCreationEvent(...param);
    } else if (options.deletion) {
      result = lib.getInstanceDeletionEvent(...param);
    } else {
      throw new Failure("You must subscribe to at least one event","ERR_INVALID_ARGS");
    }

    if (!result) {
      try{
        const res = lib.getError();
        if (res === "") throw new Failure(ErrorCode[0],"ERR_WQL_QUERY_FAIL"); //Empty message
        else throw new Failure(res,"ERR_WQL_QUERY_FAIL"); //Message
      }catch{ //Calling the lib went wrong
        throw new Failure("Unknown error","ERR_WQL_QUERY_FAIL");
      }
    }

    return emitter;
  }
};

module.exports = WQL;

// Make an extra reference to the callback pointer to avoid GC
process.on("exit", function () {
  Callback;
});
