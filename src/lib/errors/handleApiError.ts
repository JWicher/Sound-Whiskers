import { NextResponse } from 'next/server';
import { ApiError } from './ApiError';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const { status, body } = error.toResponse();
    return NextResponse.json(body, { status });
  }

  console.error('Unhandled error', error);
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
      },
    },
    { status: 500 }
  );
}
