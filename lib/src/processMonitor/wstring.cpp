/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

#include "pch.h"
#include "wstring.h"

std::string wstringToString(std::wstring wstring) { //wstring to string

	std::string result;

	int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, &wstring[0], size_tToInt(wstring.size()), NULL, 0, NULL, NULL);
	result = std::string(size, 0);
	WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, &wstring[0], size_tToInt(wstring.size()), &result[0], size, NULL, NULL);

	return result;
}

int size_tToInt(size_t val) { //64bits
	return (val <= INT_MAX) ? (int)((size_t)val) : 0;
}