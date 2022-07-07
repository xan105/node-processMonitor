/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

#include "pch.h"
#include "eventsink.h"
#include "wstring.h"

typedef void(__stdcall Callback)(char const * event, char const * process, char const * handle, char const * filepath, char const* user);
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
					_variant_t cn;
					std::string filepath;
					std::string user;
					
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

					//Additional info with WINAPI instead of WMI for speed
					if (event == "creation") { //OpenProcess() a deleted process doesn't make much sense
						HANDLE processHandle = NULL;

						processHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
						if (processHandle != NULL) {
							
							//Get path
							DWORD Size = MAX_PATH;
							wchar_t processpath[MAX_PATH];
							std::wstring sprocesspath;
							
							if (QueryFullProcessImageName(processHandle, 0, processpath, &Size)) {	
								sprocesspath = processpath;
								filepath = wstringToString(sprocesspath);
							}

							//Get user
							HANDLE hToken;
							DWORD bufSize = sizeof(TOKEN_USER) + SECURITY_MAX_SID_SIZE;
							PTOKEN_USER pTokenUser;
							wchar_t accountName[256];
							wchar_t domainName[256];
							DWORD accountLength = sizeof(accountName) / sizeof(wchar_t);
							DWORD domainLength = sizeof(domainName) / sizeof(wchar_t);
							SID_NAME_USE snu;

							if (OpenProcessToken(processHandle, TOKEN_QUERY, &hToken)) {
								if (pTokenUser = (PTOKEN_USER)LocalAlloc(LPTR, bufSize)) {
									if (GetTokenInformation(hToken, TokenUser, pTokenUser, bufSize, &bufSize)) {
										if (LookupAccountSid(NULL, pTokenUser->User.Sid, accountName, &accountLength, domainName, &domainLength, &snu)) {
											user = wstringToString(std::wstring(accountName));
										}
									}
									LocalFree(pTokenUser);
								}
							}
							CloseHandle(processHandle);
						}

					}
					callback(event.c_str(), process, handle, filepath.c_str(), user.c_str());

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
