#!/usr/bin/env node

/**
 * Meeta MCP HTTP Proxy Client
 * 
 * MCP 프로토콜과 HTTP API 간의 브릿지 역할
 * Claude Desktop이나 다른 MCP 클라이언트에서 원격 서버 접속 가능
 */

const https = require('https');
const readline = require('readline');

// 기본 API 엔드포인트 (환경변수로 오버라이드 가능)
const API_ENDPOINT = process.env.MEETA_MCP_ENDPOINT || 
  process.argv[2] || 
  'https://izlh8w6043.execute-api.ap-northeast-1.amazonaws.com/dev/mcp';

// MCP 프로토콜 버전
const PROTOCOL_VERSION = '2024-11-05';

// 디버그 모드
const DEBUG = process.env.DEBUG === 'true';

function log(...args) {
  if (DEBUG) {
    console.error('[MEETA-MCP]', ...args);
  }
}

// STDIO를 통한 JSON-RPC 통신 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// HTTP 요청 전송
async function sendHttpRequest(data, endpoint = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint || API_ENDPOINT);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'meeta-mcp-proxy/1.0.0'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    const payload = JSON.stringify(data);
    log('Sending:', payload);
    req.write(payload);
    req.end();
  });
}

// MCP 메소드를 HTTP API 호출로 변환
async function handleMcpRequest(request) {
  log('Received MCP request:', JSON.stringify(request));
  
  try {
    // initialize 메소드 처리
    if (request.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: {
            name: 'meeta-mcp-proxy',
            version: '1.0.0'
          },
          capabilities: {
            tools: {},
            resources: {}
          }
        }
      };
    }
    
    // tools/list 메소드 처리
    if (request.method === 'tools/list') {
      const httpResponse = await sendHttpRequest({
        method: 'tools/list',
        params: {}
      });
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: httpResponse.tools || []
        }
      };
    }
    
    // tools/call 메소드 처리
    if (request.method === 'tools/call') {
      const httpResponse = await sendHttpRequest({
        method: 'tools/call',
        params: {
          name: request.params.name,
          arguments: request.params.arguments
        }
      });
      
      // 응답을 MCP 형식으로 변환
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof httpResponse === 'string' ? httpResponse : JSON.stringify(httpResponse, null, 2)
            }
          ]
        }
      };
    }
    
    // 기타 메소드는 그대로 전달
    const httpResponse = await sendHttpRequest(request);
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: httpResponse
    };
    
  } catch (error) {
    log('Error:', error);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    };
  }
}

// JSON-RPC 메시지 버퍼링 및 파싱
let buffer = '';

rl.on('line', async (line) => {
  buffer += line;
  
  // Content-Length 헤더 처리 (LSP 스타일)
  if (line.startsWith('Content-Length:')) {
    return;
  }
  
  // 빈 줄은 헤더와 본문 구분
  if (line === '') {
    return;
  }
  
  try {
    // JSON 파싱 시도
    const request = JSON.parse(buffer);
    buffer = '';
    
    // MCP 요청 처리
    const response = await handleMcpRequest(request);
    
    // 응답 전송
    const responseStr = JSON.stringify(response);
    
    // LSP 스타일 응답 (Content-Length 헤더 포함)
    process.stdout.write(`Content-Length: ${responseStr.length}\r\n\r\n${responseStr}`);
    
  } catch (e) {
    // JSON이 완성되지 않았거나 파싱 에러
    if (buffer.length > 10000) {
      // 버퍼가 너무 크면 초기화
      log('Buffer overflow, resetting');
      buffer = '';
    }
  }
});

// 프로세스 종료 처리
process.on('SIGINT', () => {
  log('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  process.exit(0);
});

// 시작 메시지
log('Meeta MCP HTTP Proxy started');
log('API Endpoint:', API_ENDPOINT);

// 독립 실행 시 테스트 모드
if (require.main === module && process.argv.includes('--test')) {
  // --test 플래그를 제거한 URL 찾기
  const urlArg = process.argv.find(arg => arg.startsWith('http'));
  const testEndpoint = urlArg || 'https://izlh8w6043.execute-api.ap-northeast-1.amazonaws.com/dev/mcp';
  
  console.log('Testing connection to:', testEndpoint);
  
  // 테스트용 임시 엔드포인트 설정
  const originalEndpoint = API_ENDPOINT;
  Object.defineProperty(global, 'API_ENDPOINT', {
    value: testEndpoint,
    writable: true
  });
  
  sendHttpRequest({ method: 'tools/list', params: {} }, testEndpoint)
    .then(response => {
      console.log('Success! Available tools:');
      console.log(JSON.stringify(response, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Connection failed:', error.message);
      process.exit(1);
    });
}