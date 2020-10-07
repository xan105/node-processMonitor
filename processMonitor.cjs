"use strict";

const path = require('path');
const EventEmitter = require('events');
const ffi = require("ffi-napi");

const lib = ffi.Library(path.join(__dirname, 'lib/dist', `processMonitor.${(process.arch === "x64") ? 'x64' : 'x86'}.dll`), {
  'createEventSink': ['void', []],
  'closeEventSink': ['void', []],
  'getInstanceOperationEvent': ['bool', ['bool']],
  'getInstanceCreationEvent': ['bool', ['bool']],
  'getInstanceDeletionEvent': ['bool', ['bool']],
  'setCallback': ['void', ['pointer']]
});

const emitter = new EventEmitter();

const Callback = ffi.Callback('void', ['string','string','string'],function(event, process, pid){
  if (event === "creation") {
    emitter.emit('creation', process, pid);
  } else if (event === "deletion"){
    emitter.emit('deletion', process, pid);
  } else {
    throw "EUNEXPECTEDEVENT";
  }
});
lib.setCallback(Callback);

const WQL = {
  promises: {
    createEventSink: function(){
      return new Promise((resolve,reject) => {
        lib.createEventSink.async(function (err, res) {
          if(err) {
            return reject(err);
          } else {
            return resolve(res);
          }
        });
      });
    },
    closeEventSink: function(){
      return new Promise((resolve,reject) => {
        lib.closeEventSink.async(function (err, res) {
          if(err) {
            return reject(err);
          } else {
            return resolve(res);
          }
      });
     });
    },
    subscribe: function(option = {}){
      return new Promise((resolve,reject) => {
      
        const options = {
          filterWindowsNoise: option.filterWindowsNoise || false,
          creation: option.creation ?? true,
          deletion: option.deletion ?? true
        };

        if (options.creation && options.deletion) {
          lib.getInstanceOperationEvent.async(options.filterWindowsNoise, function (err, res) {
            if(err) {
              return reject(err);
            } else if (res === true){
              return resolve(emitter);
            } else {
              return reject("EWQLQUERYFAILED");
            }
          });
        } else if (options.creation){
          lib.getInstanceCreationEvent.async(options.filterWindowsNoise, function (err, res) {
            if(err) {
              return reject(err);
            } else if (res === true){
              return resolve(emitter);
            } else {
              return reject("EWQLQUERYFAILED");
            }
          });
        } else if (options.deletion){
          lib.getInstanceDeletionEvent.async(options.filterWindowsNoise, function (err, res) {
            if(err) {
              return reject(err);
            } else if (res === true){
              return resolve(emitter);
            } else {
              return reject("EWQLQUERYFAILED");
            }
          });
        } else {
          return reject("EINVALIDPARAMETER: You must subscribe to at least one event");
        }
        
      });
    }
  }, //Sync
  createEventSink: function(){
    lib.createEventSink();
  },
  closeEventSink: function(){
    lib.closeEventSink();
  },
  subscribe: function(option = {}){
    const options = {
      filterWindowsNoise: option.filterWindowsNoise || false,
      creation: option.creation ?? true,
      deletion: option.deletion ?? true
    };
    
    let result;
    
    if (options.creation && options.deletion) {
      result = lib.getInstanceOperationEvent(options.filterWindowsNoise);
    } else if (options.creation){
      result = lib.getInstanceCreationEvent(options.filterWindowsNoise);
    } else if (options.deletion){
      result = lib.getInstanceDeletionEvent(options.filterWindowsNoise);
    } else {
      throw "EINVALIDPARAMETER: You must subscribe to at least one event";
    }
    
    if (!result) throw "EWQLQUERYFAILED";
    
    return emitter;
    
  }
}

module.exports = WQL;

// Make an extra reference to the callback pointer to avoid GC
process.on('exit', function() {
  Callback
});
