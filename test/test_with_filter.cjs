"use strict";

const WQL = require("../lib/processMonitor.cjs");

WQL.createEventSink();
console.log("createEventSink");

const filter = ["cmd.exe", "conhost.exe", "firefox.exe"];

const processMonitor = WQL.subscribe({
  filterWindowsNoise: false,
  filter: filter,
});
console.log("subscribe");
console.log("filtering: " + filter.toString());

processMonitor.on("creation", (process, pid) => {
  console.log(`creation: ${process}::${pid}`);
});

processMonitor.on("deletion", (process, pid) => {
  console.log(`deletion: ${process}::${pid}`);
});

setInterval(() => {}, 1000 * 60 * 60); //Keep alive
