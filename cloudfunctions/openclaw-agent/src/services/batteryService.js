const { COMMISSION_PER_BATTERY } = require('../utils/validation');

const COLLECTION = 'battery_sales';

function getCollection(db) {
  return db.collection(COLLECTION);
}

async function createSale(db, _command, data) {
  const now = new Date().toISOString();
  const model = data.batteryModel.toUpperCase();

  const maxResult = await getCollection(db)
    .orderBy('serialNumber', 'desc')
    .limit(1)
    .get();

  const nextSerial = maxResult.data && maxResult.data.length > 0
    ? maxResult.data[0].serialNumber + 1
    : 1;

  const doc = {
    serialNumber: nextSerial,
    reportTime: data.reportTime || now,
    batteryModel: model,
    quantity: data.quantity,
    commissionPer: COMMISSION_PER_BATTERY,
    totalCommission: data.quantity * COMMISSION_PER_BATTERY,
    customerName: data.customerName || '',
    notes: data.notes || '',
    source: data.source || 'api',
    createdAt: now,
    updatedAt: now
  };

  const result = await getCollection(db).add(doc);
  return { ...doc, _id: result.id };
}

async function querySales(db, _command, filters = {}, pagination) {
  let query = getCollection(db);

  if (filters.batteryModel) {
    query = query.where({ batteryModel: filters.batteryModel.toUpperCase() });
  }
  if (filters.startDate) {
    query = query.where({
      reportTime: _command.gte(new Date(filters.startDate).toISOString())
    });
  }

  const countResult = await query.count();
  const total = countResult.total;

  const result = await query
    .orderBy('reportTime', 'desc')
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .get();

  return { records: result.data, total };
}

async function getSaleById(db, id) {
  const result = await getCollection(db).doc(id).get();
  if (!result.data || result.data.length === 0) return null;
  return result.data[0];
}

async function updateSale(db, _command, id, data) {
  const existing = await getSaleById(db, id);
  if (!existing) return null;

  const updateData = { updatedAt: new Date().toISOString() };

  if (data.batteryModel) updateData.batteryModel = data.batteryModel.toUpperCase();
  if (data.quantity !== undefined) {
    updateData.quantity = data.quantity;
    updateData.totalCommission = data.quantity * COMMISSION_PER_BATTERY;
  }
  if (data.reportTime) updateData.reportTime = data.reportTime;
  if (data.customerName !== undefined) updateData.customerName = data.customerName;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await getCollection(db).doc(id).update(updateData);
  return { ...existing, ...updateData };
}

async function deleteSale(db, id) {
  const existing = await getSaleById(db, id);
  if (!existing) return null;

  await getCollection(db).doc(id).remove();
  return existing;
}

module.exports = { createSale, querySales, getSaleById, updateSale, deleteSale };
