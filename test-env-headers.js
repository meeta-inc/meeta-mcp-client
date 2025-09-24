#!/usr/bin/env node

/**
 * 환경변수 헤더 전달 테스트 스크립트
 *
 * 이 스크립트는 meeta-mcp-client가 환경변수를 HTTP 헤더로
 * 올바르게 전달하는지 테스트합니다.
 */

const https = require('https');
const { spawn } = require('child_process');

// 테스트용 환경변수 설정
const testEnv = {
  MEETA_MCP_ENDPOINT: 'https://izlh8w6043.execute-api.ap-northeast-1.amazonaws.com/dev/mcp',
  JIRA_HOST: 'https://test-jira.atlassian.net',
  JIRA_EMAIL: 'test-user@example.com',
  JIRA_API_TOKEN: 'test-token-12345',
  JIRA_DEFAULT_PROJECT: 'TEST',
  DEBUG: 'true'
};

console.log('🧪 환경변수 헤더 전달 테스트 시작...\n');
console.log('설정된 테스트 환경변수:');
console.log('  JIRA_HOST:', testEnv.JIRA_HOST);
console.log('  JIRA_EMAIL:', testEnv.JIRA_EMAIL);
console.log('  JIRA_API_TOKEN:', testEnv.JIRA_API_TOKEN ? '***' + testEnv.JIRA_API_TOKEN.slice(-5) : 'Not set');
console.log('  JIRA_DEFAULT_PROJECT:', testEnv.JIRA_DEFAULT_PROJECT);
console.log('');

// MCP 클라이언트 프로세스 시작
const client = spawn('node', ['index.js'], {
  env: { ...process.env, ...testEnv },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

client.stdout.on('data', (data) => {
  output += data.toString();
});

client.stderr.on('data', (data) => {
  errorOutput += data.toString();
  // DEBUG 모드에서는 stderr 출력
  if (testEnv.DEBUG === 'true') {
    console.log('DEBUG:', data.toString());
  }
});

// MCP 요청 전송
setTimeout(() => {
  // 1. Initialize 요청
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {}
    }
  };

  console.log('📤 Initialize 요청 전송...');
  client.stdin.write(JSON.stringify(initRequest) + '\n');

  // 2. Jira 도구 호출 테스트
  setTimeout(() => {
    const toolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_current_jira_user',
        arguments: {}
      }
    };

    console.log('📤 Jira 도구 호출 요청 전송...');
    client.stdin.write(JSON.stringify(toolRequest) + '\n');

    // 결과 확인
    setTimeout(() => {
      console.log('\n📊 테스트 결과:');

      if (errorOutput.includes('X-Jira-Host')) {
        console.log('✅ HTTP 헤더에 Jira 환경변수가 포함됨');
      } else {
        console.log('⚠️  HTTP 헤더 확인 필요 (DEBUG 출력 참고)');
      }

      if (output.includes('error')) {
        console.log('❌ 오류 발생:', output);
      } else if (output.includes('result')) {
        console.log('✅ MCP 요청 성공');
      }

      // 정리
      client.kill();
      console.log('\n테스트 완료');
      process.exit(0);
    }, 2000);
  }, 1000);
}, 1000);

// 오류 처리
client.on('error', (err) => {
  console.error('❌ 프로세스 실행 오류:', err);
  process.exit(1);
});

// 타임아웃 설정 (10초)
setTimeout(() => {
  console.error('⏱️  테스트 타임아웃');
  client.kill();
  process.exit(1);
}, 10000);