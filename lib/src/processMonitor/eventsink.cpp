/*
MIT License

Copyright (c) 2020-2021 Anthony Beaumont

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#include "stdafx.h" // vs2017 use "pch.h" for vs2019
#include "eventsink.h"

typedef void(__stdcall Callback)(char const * event, char const * process, char const * handle, char const * filepath);
extern Callback* callback;

ULONG EventSink::AddRef()
{
	return InterlockedIncrement(&m_lRef);
}

ULONG EventSink::Release()
{
	LONG lRef = InterlockedDecrement(&m_lRef);
	if (lRef == 0)
		delete this;
	return lRef;
}

HRESULT EventSink::QueryInterface(REFIID riid, void** ppv)
{
	if (riid == IID_IUnknown || riid == IID_IWbemObjectSink)
	{
		*ppv = (IWbemObjectSink *)this;
		AddRef();
		return WBEM_S_NO_ERROR;
	}
	else return E_NOINTERFACE;
}

//cf: https://stackoverflow.com/questions/28897897/c-monitor-process-creation-and-termination-in-windows
HRESULT EventSink::Indicate(long lObjectCount, IWbemClassObject **apObjArray)
{
	HRESULT hr = S_OK;
	_variant_t vtProp;

	for (int i = 0; i < lObjectCount; i++)
	{
		bool CreationOrDeletionEvent = false;
		std::string event;
		_variant_t cn;
		hr = apObjArray[i]->Get(_bstr_t(L"__Class"), 0, &cn, 0, 0);
		if (SUCCEEDED(hr))
		{
			wstring LClassStr(cn.bstrVal);
			if (0 == LClassStr.compare(L"__InstanceDeletionEvent"))
			{
				event = "deletion";
				CreationOrDeletionEvent = true;
			}
			else if (0 == LClassStr.compare(L"__InstanceCreationEvent"))
			{
				event = "creation";
				CreationOrDeletionEvent = true;
			}
			else
			{
				event = "modification";
				CreationOrDeletionEvent = false;
			}
		}
		VariantClear(&cn);

		if (CreationOrDeletionEvent)
		{
			hr = apObjArray[i]->Get(_bstr_t(L"TargetInstance"), 0, &vtProp, 0, 0);
			if (!FAILED(hr))
			{
				IUnknown* str = vtProp;
				hr = str->QueryInterface(IID_IWbemClassObject, reinterpret_cast<void**>(&apObjArray[i]));
				if (SUCCEEDED(hr))
				{
					DWORD pid;
					_bstr_t process;
					_bstr_t handle;
					std::string filepath;
					_variant_t cn;
					
					hr = apObjArray[i]->Get(L"Name", 0, &cn, NULL, NULL);
					if (SUCCEEDED(hr))
					{
						if ((cn.vt == VT_NULL) || (cn.vt == VT_EMPTY))
							process = ((cn.vt == VT_NULL) ? "NULL" : "EMPTY");
						else
							process = cn.bstrVal;
					}
					VariantClear(&cn);

					hr = apObjArray[i]->Get(L"Handle", 0, &cn, NULL, NULL);
					if (SUCCEEDED(hr))
					{
						if ((cn.vt == VT_NULL) || (cn.vt == VT_EMPTY))
							handle = ((cn.vt == VT_NULL) ? "NULL" : "EMPTY");
						else {
							pid = cn;
							handle = cn.bstrVal;
						}
					}
					VariantClear(&cn);

					if (event == "creation") { //OpenProcess() a deleted process doesn't make much sense
						HANDLE processHandle = NULL;
						DWORD Size = MAX_PATH;
						wchar_t processpath[MAX_PATH];
						std::wstring sprocesspath;

						processHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
						if (processHandle != NULL) {
							if (QueryFullProcessImageName(processHandle, 0, processpath, &Size)) {
								
								sprocesspath = processpath;
								//wstring to string
								int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, &sprocesspath[0], sprocesspath.size(), NULL, 0, NULL, NULL);
								filepath = std::string(size, 0);
								WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, &sprocesspath[0], sprocesspath.size(), &filepath[0], size, NULL, NULL);

							}
							CloseHandle(processHandle);
						}

					}
					callback(event.c_str(), process, handle, filepath.c_str());

				}
				str->Release();
			}
			VariantClear(&vtProp);
		}

	}

	return WBEM_S_NO_ERROR;
}

HRESULT EventSink::SetStatus(LONG lFlags, HRESULT hResult, BSTR strParam, IWbemClassObject __RPC_FAR *pObjParam)
{
	if (lFlags == WBEM_STATUS_COMPLETE)
	{
		//Call complete
	}
	else if (lFlags == WBEM_STATUS_PROGRESS)
	{
		//Call in progress
	}

	return WBEM_S_NO_ERROR;
}
