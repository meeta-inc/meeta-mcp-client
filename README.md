# Meeta MCP HTTP Proxy

AWS 서비스에 접근할 수 있는 MCP(Model Context Protocol) 서버의 HTTP 프록시 클라이언트입니다.

## 설치 없이 바로 사용하기

```bash
# npx로 바로 실행 (설치 불필요)
npx @meeta/mcp-http-proxy
```

## Claude Desktop 설정

### 1. Claude Desktop 설정 파일 열기

**macOS:**
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 2. MCP 서버 추가

```json
{
  "mcpServers": {
    "meeta-aws": {
      "command": "npx",
      "args": [
        "-y",
        "@meeta/mcp-http-proxy"
      ]
    }
  }
}
```

### 3. Claude Desktop 재시작

설정 저장 후 Claude Desktop을 재시작하면 AWS 도구를 사용할 수 있습니다.

## 사용 가능한 도구

- **DynamoDB**: 테이블 목록 조회, 데이터 쿼리, 분석
- **S3**: 버킷 목록 조회, 컨텐츠 분석
- **Lambda**: 함수 목록, 성능 분석, 오류 분석
- **API Gateway**: API 목록, 사용량 통계, 성능 분석
- **Cost Explorer**: 비용 조회, 예측, 절감 기회 분석
- **Amplify**: 앱 목록, 빌드 상태 분석
- **EC2**: 인스턴스 목록, 리소스 분석
- **RDS**: 데이터베이스 목록, 백업 분석
- **기타**: CloudWatch, SQS, SNS, CloudFormation, ECS, IAM 등

## 커스텀 엔드포인트 사용

자체 MCP 서버가 있는 경우:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@meeta/mcp-http-proxy",
        "https://your-api-endpoint.com/mcp"
      ]
    }
  }
}
```

또는 환경변수로 설정:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": ["-y", "@meeta/mcp-http-proxy"],
      "env": {
        "MEETA_MCP_ENDPOINT": "https://your-api-endpoint.com/mcp"
      }
    }
  }
}
```

## 테스트

```bash
# 연결 테스트
npx @meeta/mcp-http-proxy --test

# 디버그 모드
DEBUG=true npx @meeta/mcp-http-proxy
```

## 문제 해결

### 연결 오류
- 인터넷 연결 확인
- 방화벽 설정 확인
- 프록시 설정 확인

### 도구가 표시되지 않음
- Claude Desktop 재시작
- 설정 파일 JSON 문법 확인
- `npx cache clear` 실행 후 재시도

## 라이선스

MIT

## 지원

- 이슈: https://github.com/meeta-inc/meeta-mcp-client/issues
- 이메일: support@meeta.io