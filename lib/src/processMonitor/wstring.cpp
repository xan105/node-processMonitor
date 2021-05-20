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