export { apiClient, apiRequest, type ApiRequestOptions } from "./api-client";
export { appConfig } from "./app-config";
export { endpoints } from "./endpoints";

export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
