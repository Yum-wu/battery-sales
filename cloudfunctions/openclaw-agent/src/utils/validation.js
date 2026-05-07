const VALID_MODELS = ['A', 'B', 'C'];
const COMMISSION_PER_BATTERY = 50;

function validateSaleInput(data) {
  const errors = [];

  if (!data.batteryModel || typeof data.batteryModel !== 'string') {
    errors.push('batteryModel is required (string)');
  } else if (!VALID_MODELS.includes(data.batteryModel.toUpperCase())) {
    errors.push(`batteryModel must be one of: ${VALID_MODELS.join(', ')}`);
  }

  if (data.quantity === undefined || data.quantity === null) {
    errors.push('quantity is required');
  } else if (!Number.isInteger(data.quantity) || data.quantity < 1) {
    errors.push('quantity must be a positive integer');
  }

  if (data.customerName !== undefined && typeof data.customerName !== 'string') {
    errors.push('customerName must be a string');
  }

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    errors.push('notes must be a string');
  }

  return errors;
}

function validateId(id) {
  if (!id || typeof id !== 'string' || id.length === 0) {
    return 'id is required';
  }
  return null;
}

function validatePagination(page, pageSize) {
  const p = Number.isInteger(page) ? page : parseInt(page, 10);
  const ps = Number.isInteger(pageSize) ? pageSize : parseInt(pageSize, 10);

  return {
    page: (!isNaN(p) && p > 0) ? p : 1,
    pageSize: (!isNaN(ps) && ps > 0 && ps <= 100) ? ps : 20
  };
}

function validateDateRange(startDate, endDate) {
  const errors = [];
  if (startDate && isNaN(new Date(startDate).getTime())) {
    errors.push('startDate is not a valid date');
  }
  if (endDate && isNaN(new Date(endDate).getTime())) {
    errors.push('endDate is not a valid date');
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push('startDate must be before endDate');
  }
  return errors;
}

module.exports = {
  validateSaleInput,
  validateId,
  validatePagination,
  validateDateRange,
  VALID_MODELS,
  COMMISSION_PER_BATTERY
};
