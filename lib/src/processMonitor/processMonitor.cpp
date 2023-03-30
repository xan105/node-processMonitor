/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.

Based from https://learn.microsoft.com/en-us/windows/win32/wmisdk/example--receiving-event-notifications-through-wmi-
Copyright(C) Microsoft.All rights reserved.
No copyright or trademark infringement is intended in using the aforementioned Microsoft example.
*/

#include "pch.h"
#include "eventsink.h"

typedef void(__stdcall Callback)(char const* event, char const* process, uint32_t handle, char const* filepath, char const* user);

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
    bool isReady = false;
    
  public:

    WQL() {}  //constructor

    long init()
    {
      if (!this->isReady) {
          
        // Step 1: Initialize COM.

        this->hres = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (FAILED(this->hres)) //Failed to initialize COM library for the calling thread
        {
          this->isReady = false;
          return this->hres;
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


        if (FAILED(this->hres)) //Failed to initialize security
        {
          CoUninitialize();
          this->isReady = false;
          return this->hres;
        }

        // Step 3: Obtain the initial locator to WMI

        this->pLoc = NULL;

        this->hres = CoCreateInstance(
          CLSID_WbemLocator,
          0,
          CLSCTX_INPROC_SERVER,
          IID_IWbemLocator, (LPVOID *)&this->pLoc);

        if (FAILED(this->hres)) //Failed to create IWbemLocator object
        {
          CoUninitialize();
          this->isReady = false;
          return this->hres;
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

        if (FAILED(this->hres)) //Could not connect to ROOT\\CIMV2 WMI namespace
        {
          this->pLoc->Release();
          CoUninitialize();
          this->isReady = false;
          return this->hres;
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

        if (FAILED(this->hres)) //Could not set proxy blanket
        {
          this->pSvc->Release();
          this->pLoc->Release();
          CoUninitialize();
          this->isReady = false;
          return this->hres;
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

        this->isReady = true;
      }
      return 0;
    }

    //WQL QUERY
    long queryAsync_InstanceEvent(char const* query)
    {
        this->hres = this->pSvc->ExecNotificationQueryAsync(
        _bstr_t("WQL"),
        _bstr_t(query),
        WBEM_FLAG_SEND_STATUS,
        NULL,
        this->pStubSink);

        if (FAILED(this->hres)) { this->close(); }
        return this->hres;
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
      this->isReady = false;
    }
};

WQL monitor;

Callback* callback;

#define APICALL  __declspec(dllexport) 
extern "C"
{
	APICALL long createEventSink()
	{
		return monitor.init();
	}
	
	APICALL void closeEventSink()
	{
		monitor.cancel();
		monitor.close();
	}

	APICALL long getInstanceEvent(char const * query)
	{
		return monitor.queryAsync_InstanceEvent(query);
	}

	APICALL void setCallback(Callback* callbackPtr) {
		callback = callbackPtr;
		return;
	}
}