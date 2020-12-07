"use strict";

const WQL = require("../lib/processMonitor.cjs");

WQL.createEventSink();
console.log("createEventSink");

const processMonitor = WQL.subscribe({ filterWindowsNoise: false });
console.log("subscribe");

processMonitor.on("creation", (process, pid, filepath) => {
  console.log(
    `\x1b[32mcreation\x1b[0m: ${process}::${pid} [\x1b[90m${filepath}\x1b[0m]`
  );
});

processMonitor.on("deletion", (process, pid) => {
  console.log(`\x1b[31mdeletion\x1b[0m: ${process}::${pid}`);
});

setInterval(() => {}, 1000 * 60 * 60); //Keep alive
