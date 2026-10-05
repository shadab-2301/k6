/**
 * Shared state for API test steps.
 * Holds the last API response so steps in different files can access it.
 */
import { ApiResponse } from "./rest-api-helper";

let _lastApiResponse: ApiResponse | null = null;

export function setLastApiResponse(response: ApiResponse): void {
  _lastApiResponse = response;
}

export function getLastApiResponse(): ApiResponse | null {
  return _lastApiResponse;
}
