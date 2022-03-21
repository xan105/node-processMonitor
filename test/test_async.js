import { promises as WQL } from "../lib/index.js";

(async () => {
  await WQL.createEventSink();
  console.log("createEventSink");

  const processMonitor = await WQL.subscribe({ filterWindowsNoise: false });
  console.log("subscribe");

  processMonitor.on("creation", ([process, pid, filepath]) => {
    console.log(`\x1b[32mcreation\x1b[0m: ${process}::${pid} [\x1b[90m${filepath}\x1b[0m]`);
  });

  processMonitor.on("deletion", ([process, pid]) => {
    console.log(`\x1b[31mdeletion\x1b[0m: ${process}::${pid}`);
  });

  setInterval(() => {}, 1000 * 60 * 60); //Keep alive
})().catch(console.error);
