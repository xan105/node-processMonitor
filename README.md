About
=====

Monitor Windows process creation/deletion events via WMI (WQL) in Node.js

Example
=======

```js
import { subscribe } from 'wql-process-monitor/promises';

const processMonitor = await subscribe();

processMonitor.on("creation", ([process,pid,filepath]) => {
  console.log(`creation: ${process}::${pid} ["${filepath}"]`);
});

processMonitor.on("deletion",([process,pid]) => {
  console.log(`deletion: ${process}::${pid}`);
});

/*
Keep alive
You don't need this if you have something else to keep the event loop running.
This is just an example so Node.js doesn't exit directly.
*/
setInterval(()=>{}, 1000 * 60 * 60);
```

<p align="center">
<img src="https://github.com/xan105/node-processMonitor/raw/main/screenshot/example.png">
</p>

Do something when a specific process is started :

```js
const processMonitor = await subscribe({
  creation: true,
  deletion: false,
  filter: ["firefox.exe"],
  whitelist: true
});

processMonitor.on("creation", ([process,pid,filepath]) => {
  console.log(`creation: ${process}::${pid} ["${filepath}"]`);
});
```

Installation
============

`npm install wql-process-monitor`

_Prerequisite: C/C++ build tools (Visual Studio) and Python 3.x (node-gyp) in order to build [node-ffi-napi](https://www.npmjs.com/package/ffi-napi)._

API
===

⚠️ This module is only available as an ECMAScript module (ESM) starting with version 2.0.0.<br />
Previous version(s) are CommonJS (CJS) with an ESM wrapper.

💡 Promises are under the `promises` namespace.
```js
import * as WQL from 'wql-process-monitor';
WQL.promises.createEventSink() //Promise
WQL.createEventSink() //Sync
```

## Named export

### subscribe
`(option?: obj): AsyncEventEmitter`

⚙️ Options:

- creation | bool (default true)

	Subscribe to the creation event
	
- deletion | bool (default true)

	Subscribe to the deletionn event
	
- filterWindowsNoise | bool (default false)

	Exclude events originating from System32 and SysWOW64 Windows folder as well as integrated OneDrive `FileCoAuth.exe`.<br/>
	Ex: cmd.exe, powershell.exe, svchost.exe, RuntimeBroker.exe, and others Windows processes.<br/>
	
	⚠️ NB: Using this will prevent you to catch any elevated process event.<br/>
	Unless you are also elevated. This is a permission issue (See [#2](https://github.com/xan105/node-processMonitor/issues/2)).<br/>
	_You can implement your own filter on top of the event emitter result instead._

- filterUsualProgramLocations | bool (default false)

	Exclude events originating from Program Files, Program Files (x86), AppData local and AppData Roaming.
	
	⚠️ NB: Using this will prevent you to catch any elevated process event.<br/>
	Unless you are also elevated. This is a permission issue (See [#2](https://github.com/xan105/node-processMonitor/issues/2)).<br/>
	_You can implement your own filter on top of the event emitter result instead._

- filter | array of string (default none)

	Custom list of process to exclude.<br/>
	eg: ["firefox.exe","chrome.exe",...]<br/>
	
	NB: `There are limits to the number of AND and OR keywords that can be used in WQL queries. Large numbers of WQL keywords used in a complex query can cause WMI to return the WBEM_E_QUOTA_VIOLATION error code as an HRESULT value. The limit of WQL keywords depends on how complex the query is`<br/>
	cf: https://docs.microsoft.com/en-us/windows/win32/wmisdk/querying-with-wql<br/>
	If you have a huge list consider implementing your own filter on top of the event emitter result instead.

- whitelist | bool (default false)

	Use `filter` option as a whitelist.<br/>
	`filterWindowsNoise` / `filterUsualProgramLocations` can still be used.<br/>
	Previously mentioned limitation(s) still apply.
	
✔️ Return a non-blocking async event emitter ([emittery](https://github.com/sindresorhus/emittery)):

```js
.on("creation", ([process,pid,filepath]) => {})
.on("deletion", ([process,pid]) => {})
```

|Value|Description|Example|
|-----|-----------|-------|
|process|process name| firefox.exe|
|pid|process identifier| 16804|
|filepath|file location path (if available¹)|C:\Program Files\Mozilla Firefox\firefox.exe|

¹filepath is only available in "creation" (well it doesn't make sense to open a deleted process for its information ^^)
and will sometimes be empty because of permission to access a process information and in the same fashion 32bits can not access 64 bits.

💡 Don't forget to keep the node.js event loop alive.

### createEventSink
`(): void`

Initialize the event sink.<br/>
This is required to do before you can subscribe to any events.<br/>
If the event sink is already initialized then nothing will be done.

💡 Since version >= 2.0.0 this is automatically done for you when you call `subscribe()`.<br/>
Method was merely kept for backward compatibility.

⚠️ If your application (the caller thread) is initializing a COM library you need to set the thread model to [COINIT_MULTITHREADED](https://docs.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-coinitializeex)
For this reason using this in Electron's main process isn't viable. If you really need to use Electron's main process; I suggest that you either
- fork a node child process or
- use web workers or
- use a hidden browser window and communicate between the main process and background window via Electron's IPC.


### closeEventSink
`(): void`

**Properly** close the event sink.<br/>
There is no 'un-subscribe' thing to do prior to closing the sink. Just close it.<br/>
It is recommended to properly close the event sink when you are done if you intend to re-open it later on.<br/>
Most of the time you wouldn't have to bother with this but it's here in case you need it.
