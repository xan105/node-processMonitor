Monitor Windows process creation/deletion events via WMI (WQL) in Node.js

Example
=======

```js
const WQL = require('wql-process-monitor');
//or esm 
import * as WQL from 'wql-process-monitor';

WQL.createEventSink(); //init the event sink 
const processMonitor = WQL.subscribe(); //subscribe to all events

// If you need promise
await WQL.promises.createEventSink();
const processMonitor = await WQL.promises.subscribe();

processMonitor.on("creation", (process,pid,filepath) => {
  console.log(`creation: ${process}::${pid} ["${filepath}"]`);
});

processMonitor.on("deletion",(process,pid) => {
  console.log(`deletion: ${process}::${pid}`);
});

/*
Keep alive
You don't need this if you have something else to keep the event loop running.
This is just as an example so node.js doesn't exit directly.
*/
setInterval(()=>{}, 1000 * 60 * 60);
```

Installation
============

`npm install wql-process-monitor`

_Prequisites: C/C++ build tools (Visual Studio) and Python 2.7 (node-gyp) in order to build [ffi-napi](https://www.npmjs.com/package/ffi-napi)._

API
===

> Promises are available for all methods under the .promises obj.

```js
//Example
const WQL = require('wql-process-monitor');
WQL.createEventSink(); //sync
WQL.promises.createEventSink(); //promise
```

Before explaining the API let's review what you need to do :

1) Initialize the event sink by using `createEventSink()`.

2) Subscribe to event(s) of your choosing : creation, deletion, or both by using `subscribe({options})`.

3) You need to keep node.js event loop alive.   

See below for details.

### createEventSink(void) : void

Initialize the event sink.<br/>
This is required to do before you can subscribe to any events.

### closeEventSink(void) : void

If you need to close the event sink.<br/>
There is no 'un-subscribe' thing to do prior to closing the sink. Just close it.<br/>
You shouldn't have to bother with this but it's here in case you need it.

### subscribe([obj option]) : EventEmitter

Options:

- creation | bool (default true)

	Subscribe to the creation event
	
- deletion | bool (default true)

	Subscribe to the deletionn event
	
- filterWindowsNoise | bool (default false)

	Exclude events originating from System32 and SysWOW64 Windows folder as well as integrated OneDrive `FileCoAuth.exe`.<br/>
	Ex: cmd.exe, powershell.exe, svchost.exe, RuntimeBroker.exe, and others Windows processes.<br/>
	
	⚠️ NB: Note that this will exclude `consent.exe` which is the UAC dialog (admin rights).<br/>
	In case a process is run with admin rights and `filterWindowsNoise` is set to `true` because of the above;<br/>
	Both `consent.exe` and the related elevated process will be excluded.<br/>

- filter | array of string (default none)

	Custom list of process to exclude.<br/>
	eg: ["firefox.exe","chrome.exe",...]<br/>
	
On failure `EWQLQUERYFAILED` the event sink will be closed.<br/>
If you want to try again to subscribe you will need to re-open the event sink with `createEventSink`

Return an event emitter:

```js
.on("creation", (process,pid,filepath) => {})
.on("deletion", (process,pid) => {})
```

Where process is the process name _eg: "firefox.exe"_, pid its process identifier and filepath its file location path ( if available* )

* filepath is only available in "creation" (well it doesn't make sense to open a deleted process for its information ^^)
and will sometimes be empty because of permission to access a process information and in the same fashion 32bits can not access 64 bits.
