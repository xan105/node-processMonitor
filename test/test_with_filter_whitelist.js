import * as WQL from "../lib/index.js";

WQL.createEventSink();
console.log("createEventSink");

const filter = ["cmd.exe", "firefox.exe", "chrome.exe"];

const processMonitor = WQL.subscribe({
  filterWindowsNoise: false,
  filterUsualProgramLocations: false,
  filter: filter,
  whitelist: true,
});
console.log("subscribe");
console.log("filtering (whitelist): " + filter.toString());

processMonitor.on("creation", ([process, pid, filepath]) => {
  console.log(`\x1b[32mcreation\x1b[0m: ${process}::${pid} [\x1b[90m${filepath}\x1b[0m]`);
});

processMonitor.on("deletion", ([process, pid]) => {
  console.log(`\x1b[31mdeletion\x1b[0m: ${process}::${pid}`);
});

setInterval(() => {}, 1000 * 60 * 60); //Keep alive
