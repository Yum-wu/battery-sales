// Test script for OpenClaw Agent Cloud Function
const { main } = require('./index.js');

// Mock test data
const testSale = {
  batteryModel: 'C',
  quantity: 10,
  customerName: '测试客户',
  notes: '测试数据'
};

const testCases = [
  // Meta endpoints
  {
    name: 'Root Endpoint',
    event: { httpMethod: 'GET', path: '/' }
  },
  {
    name: 'Health Check',
    event: { httpMethod: 'GET', path: '/health' }
  },
  {
    name: 'Get Models',
    event: { httpMethod: 'GET', path: '/models' }
  },
  // Sales CRUD
  {
    name: 'Create Sale',
    event: {
      httpMethod: 'POST',
      path: '/sales',
      body: JSON.stringify(testSale)
    },
    store: 'createdSale'  // store result for later tests
  },
  {
    name: 'Create Sale - Invalid Model',
    event: {
      httpMethod: 'POST',
      path: '/sales',
      body: JSON.stringify({ batteryModel: 'X', quantity: 1 })
    },
    expectStatus: 400
  },
  {
    name: 'Create Sale - Missing Quantity',
    event: {
      httpMethod: 'POST',
      path: '/sales',
      body: JSON.stringify({ batteryModel: 'A' })
    },
    expectStatus: 400
  },
  {
    name: 'List Sales',
    event: { httpMethod: 'GET', path: '/sales' }
  },
  {
    name: 'List Sales - Filter by Model',
    event: { httpMethod: 'GET', path: '/sales', queryStringParameters: { model: 'C' } }
  },
  {
    name: 'Get Stats',
    event: { httpMethod: 'GET', path: '/stats' }
  },
  // Chat
  {
    name: 'Chat without message',
    event: {
      httpMethod: 'POST',
      path: '/chat',
      body: JSON.stringify({})
    },
    expectStatus: 400
  }
];

let savedSaleId = null;

async function runTests() {
  console.log('=== OpenClaw Agent Cloud Function Test ===\n');

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`Testing: ${test.name}`);
    try {
      const result = await main(test.event, {});
      const statusCode = result.statusCode;
      let body = null;
      try { body = JSON.parse(result.body); } catch (e) { /* ignore */ }

      const expectedStatus = test.expectStatus || 200;
      const isSuccess = statusCode === expectedStatus;

      console.log(`  Status: ${statusCode}${isSuccess ? '' : ` (expected ${expectedStatus})`}`);

      if (body) {
        const output = JSON.stringify(body, null, 2);
        console.log(`  Response: ${output.substring(0, 300)}`);
      }

      // Store created sale ID for follow-up tests
      if (test.store === 'createdSale' && isSuccess && body && body.data) {
        savedSaleId = body.data._id || body.data.id;
        console.log(`  Saved Sale ID: ${savedSaleId}`);

        // Add follow-up tests using this ID
        if (savedSaleId) {
          testCases.push(
            {
              name: `Get Sale by ID (${savedSaleId})`,
              event: { httpMethod: 'GET', path: `/sales/${savedSaleId}` }
            },
            {
              name: `Update Sale (${savedSaleId})`,
              event: {
                httpMethod: 'PUT',
                path: `/sales/${savedSaleId}`,
                body: JSON.stringify({ quantity: 20, notes: '已更新' })
              }
            },
            {
              name: `Delete Sale (${savedSaleId})`,
              event: { httpMethod: 'DELETE', path: `/sales/${savedSaleId}` }
            }
          );
        }
      }

      if (isSuccess) {
        console.log('  ✅ PASSED\n');
        passed++;
      } else {
        console.log('  ❌ FAILED\n');
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}\n`);
      failed++;
    }
  }

  console.log('=== Test Summary ===');
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
  }
}

runTests();
