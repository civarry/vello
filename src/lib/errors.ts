import { NextResponse } from "next/server";

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Creates a standardized error response for API routes.
 * Never exposes internal error details to clients.
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = "An error occurred",
  statusCode: number = 500,
  code?: string
): NextResponse<ApiError> {
  // Log the full error for debugging (server-side only)
  if (error instanceof Error) {
    console.error(`[API Error] ${defaultMessage}:`, {
      message: error.message,
      stack: error.stack,
      code,
    });
  } else {
    console.error(`[API Error] ${defaultMessage}:`, error);
  }

  // Return sanitized error to client
  const response: ApiError = {
    error: defaultMessage,
  };

  if (code) {
    response.code = code;
  }

  // Only include details in development
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    response.details = {
      message: error.message,
    };
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Creates a validation error response.
 */
export function createValidationErrorResponse(
  message: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "VALIDATION_ERROR",
      ...(process.env.NODE_ENV === "development" && details
        ? { details }
        : {}),
    },
    { status: 400 }
  );
}

/**
 * Creates an unauthorized error response.
 */
export function createUnauthorizedResponse(
  message: string = "Unauthorized"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "UNAUTHORIZED",
    },
    { status: 401 }
  );
}

/**
 * Creates a forbidden error response.
 */
export function createForbiddenResponse(
  message: string = "Forbidden"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "FORBIDDEN",
    },
    { status: 403 }
  );
}

/**
 * Creates a not found error response.
 */
export function createNotFoundResponse(
  message: string = "Resource not found"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: "NOT_FOUND",
    },
    { status: 404 }
  );
}
