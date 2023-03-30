import * as WQL from "../lib/index.js";

const processMonitor = await WQL.subscribe();

processMonitor.on("creation", ([process, pid, filepath, user]) => {
  console.log(`\x1b[32mcreation\x1b[0m: ${process}::${pid}(${user}) [\x1b[90m${filepath}\x1b[0m]`);
});

processMonitor.on("deletion", ([process, pid, filepath]) => {
  console.log(`\x1b[31mdeletion\x1b[0m: ${process}::${pid} [\x1b[90m${filepath}\x1b[0m]`);
});

setInterval(() => {}, 1000 * 60 * 60); //Keep alive