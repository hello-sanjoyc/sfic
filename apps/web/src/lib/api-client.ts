import { appConfig } from "@/lib/app-config";
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders,
} from "axios";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;
type ApiEnvelope<T> = {
  data?: T;
  error?: boolean;
  message?: string;
  statusCode?: number;
};
type ApiError = {
  error?: { message?: string };
  message?: string;
};

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  baseUrl?: string;
  body?: BodyInit | Record<string, unknown> | null;
  query?: QueryParams;
};

function buildUrl(
  endpoint: string,
  query?: QueryParams,
  baseUrl = appConfig.apiUrl,
) {
  const url = endpoint.startsWith("http")
    ? new URL(endpoint)
    : new URL(`${baseUrl}/${endpoint.replace(/^\/+/, "")}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, String(item));
        }
      });
    });
  }

  return url.toString();
}

function headersToObject(
  headers: ApiRequestOptions["headers"],
): RawAxiosRequestHeaders | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers as RawAxiosRequestHeaders;
}

function getErrorMessage(body: unknown) {
  if (body && typeof body === "object") {
    const apiError = body as ApiError;
    return (
      apiError.error?.message ??
      apiError.message ??
      "The request could not be completed."
    );
  }

  return "The request could not be completed.";
}

const axiosClient = axios.create({
  withCredentials: true,
});

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { baseUrl, body, headers, method, query, signal } = options;

  try {
    const response = await axiosClient.request({
      data: body,
      headers: headersToObject(headers),
      method,
      signal: signal ?? undefined,
      url: buildUrl(endpoint, query, baseUrl),
    } satisfies AxiosRequestConfig);
    const responseBody = response.data;

    if (
      responseBody &&
      typeof responseBody === "object" &&
      "data" in responseBody
    ) {
      return (responseBody as ApiEnvelope<T>).data as T;
    }

    return responseBody as T;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(getErrorMessage(error.response?.data));
    }

    throw error;
  }
}

export const apiClient = {
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),
  patch: <T>(
    endpoint: string,
    body?: ApiRequestOptions["body"],
    options?: ApiRequestOptions,
  ) => apiRequest<T>(endpoint, { ...options, body, method: "PATCH" }),
  post: <T>(
    endpoint: string,
    body?: ApiRequestOptions["body"],
    options?: ApiRequestOptions,
  ) => apiRequest<T>(endpoint, { ...options, body, method: "POST" }),
  put: <T>(
    endpoint: string,
    body?: ApiRequestOptions["body"],
    options?: ApiRequestOptions,
  ) => apiRequest<T>(endpoint, { ...options, body, method: "PUT" }),
};
