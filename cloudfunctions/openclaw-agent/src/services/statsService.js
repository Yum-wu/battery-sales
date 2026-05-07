const COLLECTION = 'battery_sales';

function getCollection(db) {
  return db.collection(COLLECTION);
}

async function getStats(db, _command, startDate, endDate) {
  const startISO = startDate ? new Date(startDate).toISOString() : '1970-01-01T00:00:00.000Z';
  const endISO = endDate ? new Date(endDate).toISOString() : new Date().toISOString();

  const allResult = await getCollection(db)
    .where({
      reportTime: _command.gte(startISO).and(_command.lte(endISO))
    })
    .get();

  const records = allResult.data || [];

  let totalQuantity = 0;
  let totalCommission = 0;
  const byModel = {};
  const byDay = {};

  for (const r of records) {
    totalQuantity += r.quantity;
    totalCommission += r.totalCommission;

    const model = r.batteryModel;
    if (!byModel[model]) byModel[model] = { quantity: 0, commission: 0, records: 0 };
    byModel[model].quantity += r.quantity;
    byModel[model].commission += r.totalCommission;
    byModel[model].records += 1;

    const day = r.reportTime ? r.reportTime.substring(0, 10) : 'unknown';
    if (!byDay[day]) byDay[day] = { quantity: 0, commission: 0 };
    byDay[day].quantity += r.quantity;
    byDay[day].commission += r.totalCommission;
  }

  return {
    totalQuantity,
    totalCommission,
    totalRecords: records.length,
    byModel,
    byDay: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))
  };
}

module.exports = { getStats };
