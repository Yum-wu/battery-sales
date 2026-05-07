// Client example for OpenClaw AI Chat Agent

// Example 1: Basic chat request
async function basicChat() {
  const response = await fetch('http://localhost:9000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: '你好，请介绍一下李白',
      model: 'hunyuan-2.0-instruct-20251111',
      stream: false,
      temperature: 0.7
    })
  });

  const data = await response.json();
  console.log('Response:', data.text);
  console.log('Token usage:', data.usage);
}

// Example 2: Streaming chat request
async function streamingChat() {
  const response = await fetch('http://localhost:9000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: '用100字介绍云计算',
      model: 'deepseek-v3.2',
      stream: true,
      temperature: 0.7
    })
  });

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data.trim() === '') continue;
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.done) {
            console.log('\nStream completed. Usage:', parsed.usage);
          } else if (parsed.text) {
            process.stdout.write(parsed.text);
          }
        } catch (e) {
          console.error('Parse error:', e, 'Data:', data);
        }
      }
    }
  }
}

// Example 3: Check available models
async function checkModels() {
  const response = await fetch('http://localhost:9000/api/models');
  const data = await response.json();
  console.log('Available models:', JSON.stringify(data, null, 2));
}

// Example 4: Batch chat with conversation history
async function batchChat() {
  const response = await fetch('http://localhost:9000/api/chat/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: '你是一个有帮助的AI助手' },
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的？' },
        { role: 'user', content: '请用简单的语言解释什么是人工智能' }
      ],
      model: 'hunyuan-2.0-instruct-20251111'
    })
  });

  const data = await response.json();
  console.log('Batch response:', data.text);
  console.log('Total tokens:', data.usage.total_tokens);
}

// Example 5: Using different AI providers
async function testDifferentProviders() {
  const providers = [
    { provider: 'hunyuan-exp', model: 'hunyuan-2.0-instruct-20251111' },
    { provider: 'deepseek', model: 'deepseek-v3.2' }
  ];

  for (const config of providers) {
    console.log(`\nTesting ${config.provider} with model ${config.model}:`);
    
    const response = await fetch('http://localhost:9000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '用一句话介绍你自己',
        provider: config.provider,
        model: config.model,
        stream: false
      })
    });

    const data = await response.json();
    console.log(`Response: ${data.text.substring(0, 100)}...`);
    console.log(`Tokens: ${data.usage.total_tokens}`);
  }
}

// Run examples
async function runExamples() {
  console.log('=== OpenClaw AI Chat Agent Client Examples ===\n');
  
  try {
    // 1. Check available models
    console.log('1. Checking available models...');
    await checkModels();
    
    // 2. Basic chat
    console.log('\n2. Testing basic chat...');
    await basicChat();
    
    // 3. Test different providers
    console.log('\n3. Testing different AI providers...');
    await testDifferentProviders();
    
    // 4. Batch chat
    console.log('\n4. Testing batch chat...');
    await batchChat();
    
    console.log('\n=== All examples completed successfully ===');
    
  } catch (error) {
    console.error('Error running examples:', error.message);
    console.log('\nMake sure the server is running on http://localhost:9000');
    console.log('Start the server with: npm start');
  }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--stream')) {
    streamingChat().catch(console.error);
  } else if (args.includes('--models')) {
    checkModels().catch(console.error);
  } else if (args.includes('--batch')) {
    batchChat().catch(console.error);
  } else {
    runExamples().catch(console.error);
  }
}

export { basicChat, streamingChat, checkModels, batchChat, testDifferentProviders };