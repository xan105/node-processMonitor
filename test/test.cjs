"use strict"

const toast = require("powertoast");
const WQL = require('../processMonitor.cjs');

const Timer = require('./timer.cjs');
const gameindex = require("./gameIndex.json");


WQL.createEventSink();
console.log("createEventSink");

const processMonitor = WQL.subscribe({ filterWindowsNoise: false });
console.log("subscribe")

let nowPlaying = [];

processMonitor.on("creation", (process,pid) => {
  
  console.log(`creation: ${process}::${pid}`);
  
  const game = gameindex.find(game => game.binary === process);
  if(game) 
  {
    console.log(`DB Hit for ${game.name}(${game.appid})`);
    if (nowPlaying.includes(game)) {
      console.log("Already playing ! (Only one instance supported");
    } else {
    
      const playing = Object.assign(game,{ 
        pid: pid,
        timer: new Timer
      });
      console.log(playing);
      
      nowPlaying.push(playing);
    }

    toast({
      appID: "Microsoft.XboxApp_8wekyb3d8bbwe!Microsoft.XboxApp",
      uniqueID: `${game.appid}`,
      title: game.name,
      message: `Now playing`,
      icon: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appid}/${game.icon}.jpg`,
      silent: true
    }).catch(()=>{});
  }
  
});

processMonitor.on("deletion",(process,pid) => {
  
  console.log(`deletion: ${process}::${pid}`);
  
  const game = nowPlaying.find(game => game.pid === pid && game.binary === process);
  if (game)
  {
    console.log(`Stop playing ${game.name}(${game.appid})`);
    game.timer.stop();
    const playedtime = game.timer.played;
    
    let index = nowPlaying.indexOf(game);
    if (index !== -1) { nowPlaying.splice(index, 1); } //remove from nowPlaying
 
    console.log("playtime: " + Math.floor( playedtime / 60 ) + "min");
    
    toast({
      appID: "Microsoft.XboxApp_8wekyb3d8bbwe!Microsoft.XboxApp",
      uniqueID: `${game.appid}`,
      title: game.name,
      message: `You played ${Math.floor( playedtime / 60 )} min`,
      icon: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appid}/${game.icon}.jpg`,
      silent: true
    }).catch(()=>{});
    
  }

});

setInterval(()=>{}, 1000 * 60 * 60); //Keep alive