/**
 * Pagination utilities dengan safe parsing.
 */

export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const pageStr = searchParams.get("page") ?? "1";
  const limitStr = searchParams.get("limit") ?? "20";

  const parsedPage = parseInt(pageStr, 10);
  const parsedLimit = parseInt(limitStr, 10);

  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const limit = Math.max(1, Math.min(100, isNaN(parsedLimit) ? 20 : parsedLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginationResponse(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
