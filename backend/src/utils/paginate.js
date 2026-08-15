// backend/src/utils/paginate.js

/**
 * Extract pagination params from query string
 * @param {object} query - req.query
 * @returns {{ page, limit, skip }}
 */
const getPagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

const paginate = async (model, args, pageParam, limitParam) => {
  const page  = Math.max(1, parseInt(pageParam || args.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || args.limit) || 20));
  const skip  = (page - 1) * limit;

  // Extract page/limit from args if they exist to avoid Prisma "unknown argument" errors
  const { page: _p, limit: _l, ...prismaArgs } = args;

  const [data, total] = await Promise.all([
    model.findMany({ ...prismaArgs, skip, take: limit }),
    model.count({ where: prismaArgs.where })
  ]);

  return {
    data,
    pagination: buildPaginationMeta(total, page, limit)
  };
};

module.exports = { getPagination, buildPaginationMeta, paginate };
