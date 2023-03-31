About
=====

Monitor Windows process creation/deletion events.

Example
=======

```js
import { subscribe } from "wql-process-monitor";

const processMonitor = await subscribe({
  creation: true,
  deletion: true
});

processMonitor.on("creation", ([process, pid, filepath, user]) => {
  console.log(`creation: ${process}::${pid}(${user}) ["${filepath}"]`);
});

processMonitor.on("deletion",([process, pid, filepath]) => {
  console.log(`deletion: ${process}::${pid} ["${filepath}"]`);
});

//Keep the event loop running
setInterval(()=>{}, 1000 * 60 * 60);
/*
You don't need this if you have something else to keep the event loop running.
This is just an example so Node.js doesn't exit directly.
*/
```

<p align="center">
<img src="https://github.com/xan105/node-processMonitor/raw/main/screenshot/example.png">
</p>

Do something when a specific process is started :

```js
const processMonitor = await subscribe({
  creation: true,
  deletion: false,
  bin: {
    filter: ["firefox.exe"],
    whitelist: true
  }
});

processMonitor.on("creation", ([process, pid, filepath, user]) => {
  //Do something only when "firefox.exe" is started (creation)
});
```

Installation
============

```
npm install wql-process-monitor
```

Prerequisite: C/C++ build tools (Visual Studio) and Python 3.x (node-gyp) in order to build [koffi](https://www.npmjs.com/package/koffi).

API
===

⚠️ This module is only available as an ECMAScript module (ESM) starting with version 2.0.0.<br />
Previous version(s) are CommonJS (CJS) with an ESM wrapper.

## Named export

### `subscribe(option?: object): Promise<AsyncEventEmitter>`

Subscribe to an operation event. You must at least choose one.

**⚙️ Options:**

- creation?: boolean | `true`

  Subscribe to the creation event.

- deletion?: boolean | `true`

	Subscribe to the deletion event.

- dir?: object

<details><summary>Filter via path:</summary>

  + filter?: string[] | `[] (none)`
  
    Exclude events originating from a list of path(s). This can be a full path or a part of it.<br/>
    Path separator can either be `/` (Unix) or `\\` (Windows).
    
  + whitelist?: boolean | `false`

    Turn the above filter option into a whitelist instead of a blacklist.<br/>
    Only the events originating from the list will be allowed.
    
    ⚠️ When filtering by executable path you won't be able to catch any elevated process event. Unless you are also elevated. 
    This is a Windows permission issue: 
    
    WMI `executablePath` requires `SeDebugPrivilege` permission in this case. This token is automatically granted when running with admin privileges. You can set this permission for regular user via group policy but this is considered as a security risk. 
    NB: Please be advised that this library doesn't try to adjust token privilege.

    ⚠️ There is a hard limit to the number of elements you can filter depending on how complex the query is
    which will cause WMI to return `WBEM_E_QUOTA_VIOLATION`.

    💡 In such cases consider implementing your own filter on top of the event emitter result instead.

</details>
  
- bin?: object

<details><summary>Filter via name:</summary>

  + filter?: string[] | `[] (none)`
  
    List of process to exclude.<br/>
    eg: ["firefox.exe", "chrome.exe", ...]
    
  + whitelist?: boolean | `false`

	  Turn the above filter option into a whitelist instead of a blacklist.<br/>
    Only the process from the list will be allowed.
    
    ⚠ ️There is a hard limit to the number of elements you can filter depending on how complex the query is which will cause WMI to return `WBEM_E_QUOTA_VIOLATION`.

    💡 In such case consider implementing your own filter on top of the event emitter result instead.

</details>

**Return**

Returns a non-blocking async event emitter ([emittery](https://github.com/sindresorhus/emittery)):

```ts
.on(event: "creation | deletion", ([
    process: string, //process name
    pid: string, //process identifier
    filepath: string, //file location path
    user: string //process owner
]) => {})
```

⚠️ `filepath` and/or `user` _might_ be empty if you don't have the permission to access the corresponding process information.

💡 NB: Don't forget to keep the node.js event loop alive.

### `createEventSink(): Promise<void>`

Initialize the event sink.<br/>
This is required to do before you can subscribe to any events.<br/>
If the event sink is already initialized then nothing will be done.

💡 Since version >= 2.0.0 this is automatically done for you when you call `subscribe()`.<br/>
Method was merely kept for backward compatibility.

⚠️ If your application (the caller thread) is initializing a COM library you need to set the thread model to [COINIT_MULTITHREADED](https://docs.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-coinitializeex)

NB: For this reason using this in Electron's main process isn't viable. Workarounds are in no particular preference order:

- fork a child process via `utilityProcess`
- fork a regular node child process
- use web workers
- use a hidden browser window with node integration and communicate between the main process and background window via IPC.

### `closeEventSink(): Promise<void>`

**Properly** close the event sink.<br/>
There is no "un-subscribe" thing to do prior to closing the sink. Just close it.<br/>
It is recommended to properly close the event sink when you are done if you intend to re-open it later on.<br/>
Most of the time you wouldn't have to bother with this but it's here in case you need it.

NB: This method will also remove every event listener.
