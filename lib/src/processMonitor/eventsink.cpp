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
#include "wstring.h"

typedef void(__stdcall Callback)(char const * event, char const * process, uint32_t handle, char const * filepath, char const* user);
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
		_variant_t cn;
		std::string event;
		hr = apObjArray[i]->Get(_bstr_t(L"__Class"), 0, &cn, 0, 0);
		if (SUCCEEDED(hr))
		{
			wstring LClassStr(cn.bstrVal);
			if (0 == LClassStr.compare(L"__InstanceDeletionEvent")) { event = "deletion"; }
			else if (0 == LClassStr.compare(L"__InstanceCreationEvent")) { event = "creation"; }
			else { event = "modification"; }
		}
		VariantClear(&cn);

		if (event == "creation" || event == "deletion")
		{
			hr = apObjArray[i]->Get(_bstr_t(L"TargetInstance"), 0, &vtProp, 0, 0);
			if (!FAILED(hr))
			{
				IUnknown* str = vtProp;
				hr = str->QueryInterface(IID_IWbemClassObject, reinterpret_cast<void**>(&apObjArray[i]));
				if (SUCCEEDED(hr))
				{
					_variant_t cn;
					_bstr_t process, execPath;
					DWORD pid = 0; //System Idle Process
					std::string filepath;
					std::string user = "SYSTEM";

					hr = apObjArray[i]->Get(L"Name", 0, &cn, NULL, NULL);
					if (SUCCEEDED(hr) && !(cn.vt == VT_NULL || cn.vt == VT_EMPTY)) { process = cn.bstrVal; }
					VariantClear(&cn);

					hr = apObjArray[i]->Get(L"Handle", 0, &cn, NULL, NULL);
					if (SUCCEEDED(hr) && !(cn.vt == VT_NULL || cn.vt == VT_EMPTY)) { pid = cn; }
					VariantClear(&cn);

					hr = apObjArray[i]->Get(L"ExecutablePath", 0, &cn, NULL, NULL);
					if (SUCCEEDED(hr) && !(cn.vt == VT_NULL || cn.vt == VT_EMPTY)) { 
						execPath = cn.bstrVal; 
						filepath = execPath;
					}
					VariantClear(&cn);

					//Additional info with WINAPI instead of WMI (permission)
					if (event == "creation") //OpenProcess() a deleted process doesn't make much sense
					{
						HANDLE processHandle = NULL;
						processHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
						if (processHandle != NULL)
						{
							if (filepath.empty()) {
								//Get path
								//This is more "reliable" permission wise than WMI "executablePath" 
								DWORD Size = MAX_PATH;
								wchar_t processpath[MAX_PATH];

								if (QueryFullProcessImageName(processHandle, 0, processpath, &Size)) {
									filepath = wstringToString(std::wstring(processpath));
								}
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
					callback(event.c_str(), process, pid, filepath.c_str(), user.c_str());

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
	return WBEM_S_NO_ERROR;
}
