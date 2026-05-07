const { success, created, error, notFound, serverError } = require('../utils/response');
const { validateSaleInput, validateId, validateDateRange } = require('../utils/validation');
const { parsePagination, paginatedResult } = require('../utils/pagination');
const batteryService = require('../services/batteryService');
const statsService = require('../services/statsService');

async function handleCreateSale(ctx, body) {
  const errors = validateSaleInput(body);
  if (errors.length > 0) {
    return error('Validation failed', 400, errors);
  }

  try {
    const doc = await batteryService.createSale(ctx.db, ctx._, body);
    return created(doc);
  } catch (e) {
    return serverError(e.message);
  }
}

async function handleQuerySales(ctx, query) {
  const pagination = parsePagination(query);
  const filters = {};

  if (query.model) filters.batteryModel = query.model;
  if (query.startDate) filters.startDate = query.startDate;
  if (query.endDate) filters.endDate = query.endDate;

  if (query.startDate || query.endDate) {
    const dateErrors = validateDateRange(query.startDate, query.endDate);
    if (dateErrors.length > 0) {
      return error('Invalid date range', 400, dateErrors);
    }
  }

  try {
    const { records, total } = await batteryService.querySales(ctx.db, ctx._, filters, pagination);
    return success(paginatedResult(records, total, pagination.page, pagination.pageSize));
  } catch (e) {
    return serverError(e.message);
  }
}

async function handleGetSale(ctx, id) {
  const idError = validateId(id);
  if (idError) return error(idError, 400);

  try {
    const doc = await batteryService.getSaleById(ctx.db, id);
    if (!doc) return notFound('Sale record not found');
    return success(doc);
  } catch (e) {
    return serverError(e.message);
  }
}

async function handleUpdateSale(ctx, id, body) {
  const idError = validateId(id);
  if (idError) return error(idError, 400);

  try {
    const doc = await batteryService.updateSale(ctx.db, ctx._, id, body);
    if (!doc) return notFound('Sale record not found');
    return success(doc);
  } catch (e) {
    return serverError(e.message);
  }
}

async function handleDeleteSale(ctx, id) {
  const idError = validateId(id);
  if (idError) return error(idError, 400);

  try {
    const doc = await batteryService.deleteSale(ctx.db, id);
    if (!doc) return notFound('Sale record not found');
    return success({ deleted: true, _id: id });
  } catch (e) {
    return serverError(e.message);
  }
}

async function handleStats(ctx, query) {
  if (query.startDate || query.endDate) {
    const dateErrors = validateDateRange(query.startDate, query.endDate);
    if (dateErrors.length > 0) {
      return error('Invalid date range', 400, dateErrors);
    }
  }

  try {
    const stats = await statsService.getStats(ctx.db, ctx._, query.startDate, query.endDate);
    return success(stats);
  } catch (e) {
    return serverError(e.message);
  }
}

module.exports = {
  handleCreateSale,
  handleQuerySales,
  handleGetSale,
  handleUpdateSale,
  handleDeleteSale,
  handleStats
};
