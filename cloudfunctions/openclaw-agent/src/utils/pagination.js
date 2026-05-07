function parsePagination(query = {}) {
  const page = parseInt(query.page, 10) || 1;
  const pageSize = parseInt(query.pageSize, 10) || 20;
  const validPage = page > 0 ? page : 1;
  const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 20;
  const skip = (validPage - 1) * validPageSize;

  return { page: validPage, pageSize: validPageSize, skip };
}

function paginatedResult(data, total, page, pageSize) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

module.exports = { parsePagination, paginatedResult };
