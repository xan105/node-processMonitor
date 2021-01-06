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

const lib = ffi.Library(
  path.join(__dirname, "dist", `processMonitor.${process.arch === "x64" ? "x64" : "x86"}.dll`),
  {
    createEventSink: ["void", []],
    closeEventSink: ["void", []],
    getInstanceOperationEvent: ["bool", ["bool", "bool", "string"]],
    getInstanceCreationEvent: ["bool", ["bool", "bool", "string"]],
    getInstanceDeletionEvent: ["bool", ["bool", "bool", "string"]],
    setCallback: ["void", ["pointer"]],
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
      throw "ERR_UNEXPECTED_EVENT";
    }
  }
);
lib.setCallback(Callback);

const WQL = {
  promises: {
    createEventSink: function () {
      return new Promise((resolve, reject) => {
        lib.createEventSink.async(function (err, res) {
          if (err) {
            return reject(err);
          } else {
            return resolve(res);
          }
        });
      });
    },
    closeEventSink: function () {
      return new Promise((resolve, reject) => {
        lib.closeEventSink.async(function (err, res) {
          if (err) {
            return reject(err);
          } else {
            return resolve(res);
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
        };

        if (options.creation && options.deletion) {
          lib.getInstanceOperationEvent.async(
            options.filterWindowsNoise,
            options.filterUsualProgramLocations,
            options.filter.toString(),
            function (err, res) {
              if (err) {
                return reject(err);
              } else if (res === true) {
                return resolve(emitter);
              } else {
                return reject("ERR_WQL_QUERY_FAILED");
              }
            }
          );
        } else if (options.creation) {
          lib.getInstanceCreationEvent.async(
            options.filterWindowsNoise,
            options.filterUsualProgramLocations,
            options.filter.toString(),
            function (err, res) {
              if (err) {
                return reject(err);
              } else if (res === true) {
                return resolve(emitter);
              } else {
                return reject("ERR_WQL_QUERY_FAILED");
              }
            }
          );
        } else if (options.deletion) {
          lib.getInstanceDeletionEvent.async(
            options.filterWindowsNoise,
            options.filterUsualProgramLocations,
            options.filter.toString(),
            function (err, res) {
              if (err) {
                return reject(err);
              } else if (res === true) {
                return resolve(emitter);
              } else {
                return reject("ERR_WQL_QUERY_FAILED");
              }
            }
          );
        } else {
          return reject("ERR_INVALID_PARAMETER: You must subscribe to at least one event");
        }
      });
    },
  }, //Sync
  createEventSink: function () {
    lib.createEventSink();
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
    };

    let result;

    if (options.creation && options.deletion) {
      result = lib.getInstanceOperationEvent(
        options.filterWindowsNoise,
        options.filterUsualProgramLocations,
        options.filter.toString()
      );
    } else if (options.creation) {
      result = lib.getInstanceCreationEvent(
        options.filterWindowsNoise,
        options.filterUsualProgramLocations,
        options.filter.toString()
      );
    } else if (options.deletion) {
      result = lib.getInstanceDeletionEvent(
        options.filterWindowsNoise,
        options.filterUsualProgramLocations,
        options.filter.toString()
      );
    } else {
      throw "ERR_INVALID_PARAMETER: You must subscribe to at least one event";
    }

    if (!result) throw "ERR_WQL_QUERY_FAILED";

    return emitter;
  },
};

module.exports = WQL;

// Make an extra reference to the callback pointer to avoid GC
process.on("exit", function () {
  Callback;
});
