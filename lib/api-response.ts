import { NextResponse } from 'next/server';

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
};

export type ApiResponseEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function apiError(error: string): ApiErrorResponse {
  return { success: false, error };
}

export function toApiJson<T>(
  body: ApiResponseEnvelope<T>,
  status = 200,
): NextResponse<ApiResponseEnvelope<T>> {
  return NextResponse.json(body, { status });
}
