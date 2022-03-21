/*
Copyright (c) Anthony Beaumont
This source code is licensed under the MIT License
found in the LICENSE file in the root directory of this source tree.
*/

const ErrorCodes = {
  1: "COM library for the calling thread already initialized with different threading model. Please use 'COINIT_MULTITHREADED'",
  2: "Failed to initialize COM library for the calling thread",
  3: "Failed to initialize security",
  4: "Failed to create IWbemLocator object",
  5: "Could not connect to ROOT\\CIMV2 WMI namespace",
  6: "Could not set proxy blanket"
};

export { ErrorCodes };