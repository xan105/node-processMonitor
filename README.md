Monitor Windows process creation/deletion events via WMI (WQL) in Node.js

Example
=======

```js
import { promises as WQL } from 'wql-process-monitor';

const processMonitor = await WQL.subscribe();

processMonitor.on("creation", ([process,pid,filepath]) => {
  console.log(`creation: ${process}::${pid} ["${filepath}"]`);
});

processMonitor.on("deletion",([process,pid]) => {
  console.log(`deletion: ${process}::${pid}`);
});

/*
Keep alive
You don't need this if you have something else to keep the event loop running.
This is just as an example so node.js doesn't exit directly.
*/
setInterval(()=>{}, 1000 * 60 * 60);
```

Do something when a specific process is started :

```js
const processMonitor = await WQL.subscribe({
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

_Prequisites: C/C++ build tools (Visual Studio) and Python ~2.7~ 3.x (node-gyp) in order to build [node-ffi-napi](https://www.npmjs.com/package/ffi-napi)._

API
===

> Promises are available for all methods under the .promises obj.

```js
//Example cjs
const WQL = require('wql-process-monitor');
WQL.createEventSink(); //sync
WQL.promises.createEventSink(); //promise
```

💡 Usage of promise instead of sync is recommended so that you will not block Node's event loop.

### subscribe([obj option]) : AsyncEventEmitter

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
|filepath|file location path (if available*)|C:\Program Files\Mozilla Firefox\firefox.exe|

*filepath is only available in "creation" (well it doesn't make sense to open a deleted process for its information ^^)
and will sometimes be empty because of permission to access a process information and in the same fashion 32bits can not access 64 bits.

💡 Don't forget to keep the node.js event loop alive.

### createEventSink(void) : void

Initialize the event sink.<br/>
This is required to do before you can subscribe to any events.<br/>
If the event sink is already initialized then nothing will be done.

💡 Since version >= 2.0 this is automatically done for you when you call `subscribe()`.<br/>
Method was kept for backward compatibility.

### closeEventSink(void) : void

**Properly** close the event sink.<br/>
There is no 'un-subscribe' thing to do prior to closing the sink. Just close it.<br/>
It is recommended to properly close the event sink when you are done if you intend to re-open it later on.<br/>
Most of the time you wouldn't have to bother with this but it's here in case you need it.
