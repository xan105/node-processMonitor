#include "stdafx.h" // vs2017 use "pch.h" for vs2019
#include "eventsink.h"

//cf: https://docs.microsoft.com/en-us/windows/win32/wmisdk/example--receiving-event-notifications-through-wmi-

typedef void(__stdcall Callback)(char const * event, char const * process, char const * handle);

class WQL
{
private:
	HRESULT hres;
	IWbemLocator *pLoc;
	IWbemServices *pSvc;
	IUnsecuredApartment* pUnsecApp;
	EventSink* pSink;
	IUnknown* pStubUnk;
	IWbemObjectSink* pStubSink;

	const _bstr_t WQL_filterWindowsNoise = (
		"AND NOT TargetInstance.ExecutablePath LIKE '%Windows\\\\System32%'"
		"AND NOT TargetInstance.ExecutablePath LIKE '%Windows\\\\SysWOW64%'"
		"AND TargetInstance.Name != 'FileCoAuth.exe'" //OneDrive
	);

public:

	WQL() {}  //constructor
	
	void init()
	{
		// Step 1: Initialize COM.

		this->hres = CoInitializeEx(0, COINIT_MULTITHREADED);
		if (FAILED(this->hres))
		{
			throw std::runtime_error("Failed to initialize COM library");
		}

		// Step 2: Set general COM security levels

		this->hres = CoInitializeSecurity(
			NULL,
			-1,                          // COM negotiates service
			NULL,                        // Authentication services
			NULL,                        // Reserved
			RPC_C_AUTHN_LEVEL_DEFAULT,   // Default authentication 
			RPC_C_IMP_LEVEL_IMPERSONATE, // Default Impersonation  
			NULL,                        // Authentication info
			EOAC_NONE,                   // Additional capabilities 
			NULL                         // Reserved
		);


		if (FAILED(this->hres))
		{
			CoUninitialize();
			throw std::runtime_error("Failed to initialize security");
		}

		// Step 3: Obtain the initial locator to WMI

		this->pLoc = NULL;

		this->hres = CoCreateInstance(
			CLSID_WbemLocator,
			0,
			CLSCTX_INPROC_SERVER,
			IID_IWbemLocator, (LPVOID *)&this->pLoc);

		if (FAILED(this->hres))
		{
			CoUninitialize();
			throw std::runtime_error("Failed to create IWbemLocator object");
		}

		// Step 4: Connect to WMI through the IWbemLocator::ConnectServer method

		this->pSvc = NULL;

		// Connect to the local root\cimv2 namespace
		// and obtain pointer pSvc to make IWbemServices calls.
		this->hres = this->pLoc->ConnectServer(
			_bstr_t(L"ROOT\\CIMV2"),
			NULL,
			NULL,
			0,
			NULL,
			0,
			0,
			&this->pSvc
		);

		if (FAILED(this->hres))
		{
			this->pLoc->Release();
			CoUninitialize();
			throw std::runtime_error("Could not connect to ROOT\\CIMV2 WMI namespace");
		}

		// Step 5: Set security levels on the proxy

		this->hres = CoSetProxyBlanket(
			this->pSvc,                  // Indicates the proxy to set
			RPC_C_AUTHN_WINNT,           // RPC_C_AUTHN_xxx 
			RPC_C_AUTHZ_NONE,            // RPC_C_AUTHZ_xxx 
			NULL,                        // Server principal name 
			RPC_C_AUTHN_LEVEL_CALL,      // RPC_C_AUTHN_LEVEL_xxx 
			RPC_C_IMP_LEVEL_IMPERSONATE, // RPC_C_IMP_LEVEL_xxx
			NULL,                        // client identity
			EOAC_NONE                    // proxy capabilities 
		);

		if (FAILED(this->hres))
		{
			this->pSvc->Release();
			this->pLoc->Release();
			CoUninitialize();
			throw std::runtime_error("Could not set proxy blanket");
		}

		// Step 6: Receive event notifications

		// Use an unsecured apartment for security
		this->pUnsecApp = NULL;

		this->hres = CoCreateInstance(CLSID_UnsecuredApartment, NULL,
			CLSCTX_LOCAL_SERVER, IID_IUnsecuredApartment,
			(void**)&this->pUnsecApp);

		this->pSink = new EventSink;
		pSink->AddRef();

		this->pStubUnk = NULL;
		pUnsecApp->CreateObjectStub(this->pSink, &this->pStubUnk);

		this->pStubSink = NULL;
		pStubUnk->QueryInterface(IID_IWbemObjectSink,
			(void **)&this->pStubSink);
	}

	bool queryAsync_InstanceOperationEvent(bool filterWindowsNoise)
	{
		_bstr_t WQL_Query = ( //WQL query for __InstanceOperationEvent (Creation + Deletion)
			"SELECT * "
			"FROM __InstanceOperationEvent WITHIN 1 "
			"WHERE TargetInstance ISA 'Win32_Process'"
		);
		
		if (filterWindowsNoise) {
			WQL_Query = WQL_Query + this->WQL_filterWindowsNoise;
		}
		
		this->hres = this->pSvc->ExecNotificationQueryAsync(
			_bstr_t("WQL"),
			WQL_Query,
			WBEM_FLAG_SEND_STATUS,
			NULL,
			this->pStubSink);

		if (FAILED(this->hres))
		{
			this->close();
			return false;
		}
		else
		{
			return true;
		}
	}
	
	bool queryAsync_InstanceCreationEvent(bool filterWindowsNoise) 
	{
		_bstr_t WQL_Query = ( //WQL query for InstanceCreationEvent
			"SELECT * "
			"FROM __InstanceCreationEvent WITHIN 1 "
			"WHERE TargetInstance ISA 'Win32_Process'"
			);

		if (filterWindowsNoise) {
			WQL_Query = WQL_Query + this->WQL_filterWindowsNoise;
		}

		this->hres = this->pSvc->ExecNotificationQueryAsync(
			_bstr_t("WQL"),
			WQL_Query,
			WBEM_FLAG_SEND_STATUS,
			NULL,
			this->pStubSink);

		if (FAILED(this->hres))
		{
			this->close();
			return false;
		}
		else
		{
			return true;
		}
	}

	bool queryAsync_InstanceDeletionEvent(bool filterWindowsNoise)
	{
		_bstr_t WQL_Query = ( //WQL query for InstanceDeletionEvent
			"SELECT * "
			"FROM __InstanceDeletionEvent WITHIN 1 "
			"WHERE TargetInstance ISA 'Win32_Process'"
			);

		if (filterWindowsNoise) {
			WQL_Query = WQL_Query + this->WQL_filterWindowsNoise;
		}

		this->hres = this->pSvc->ExecNotificationQueryAsync(
			_bstr_t("WQL"),
			WQL_Query,
			WBEM_FLAG_SEND_STATUS,
			NULL,
			this->pStubSink);

		if (FAILED(this->hres))
		{
			this->close();
			return false;
		}
		else
		{
			return true;
		}
	}

	void cancel()
	{
		this->hres = this->pSvc->CancelAsyncCall(this->pStubSink);
	}

	void close()
	{
		this->pSvc->Release();
		this->pLoc->Release();
		this->pUnsecApp->Release();
		this->pStubUnk->Release();
		this->pSink->Release();
		this->pStubSink->Release();
		CoUninitialize();
	}
};

WQL monitor;

Callback* callback;

#define APICALL  __declspec(dllexport) 
extern "C"
{
	APICALL void createEventSink()
	{
		monitor.init();
	}
	
	APICALL void closeEventSink()
	{
		monitor.cancel();
		monitor.close();
	}
	
	APICALL bool getInstanceOperationEvent(bool filterWindowsNoise)
	{
		return monitor.queryAsync_InstanceOperationEvent(filterWindowsNoise);
	}
	
	APICALL bool getInstanceCreationEvent(bool filterWindowsNoise)
	{
		return monitor.queryAsync_InstanceCreationEvent(filterWindowsNoise);
	}

	APICALL bool getInstanceDeletionEvent(bool filterWindowsNoise)
	{
		return monitor.queryAsync_InstanceDeletionEvent(filterWindowsNoise);
	}

	APICALL void setCallback(Callback* callbackPtr) {
		callback = callbackPtr;
		return;
	}
}