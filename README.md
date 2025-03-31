# Discord Bot

멀티 기능을 갖춘 Discord 봇으로, 메이플스토리 정보 제공, 음악 재생, AI 대화 및 다양한 유틸리티 기능을 제공합니다.

## 주요 기능

### 명령어 시스템
- 텍스트 채널에서 `!` 또는 `/`로 시작하는 명령어 처리
- 슬래시 명령어 지원으로 편리한 사용자 경험 제공

### AI 대화 기능
- Google의 Gemini AI를 활용한 자연스러운 대화 지원
- 봇이 멘션되었을 때 자동 응답
- `!ai [질문]` 명령어로 AI에게 직접 질문 가능

### 음악 재생 기능
- YouTube에서 음악 검색 및 재생
- `!play [노래 제목 또는 URL]`: 음악 재생
- `!skip`: 현재 곡 건너뛰기
- `!stop`: 재생 중지 및 음성 채널 나가기

### 메이플스토리 기능
- `!name [캐릭터명]`: 메이플스토리 캐릭터 정보 조회
- `!noti`: 메이플스토리 공지사항, 업데이트, 이벤트, 캐시샵 알림 활성화
- `!ns`: 알림 비활성화

### 유틸리티 기능
- `!clear [숫자]` 또는 `!청소 [숫자]`: 채팅 메시지 삭제
- `!userclear @유저 [숫자]` 또는 `!유저청소 @유저 [숫자]`: 특정 유저의 메시지만 삭제
- `!tts [텍스트]`: 텍스트를 음성으로 변환하여 음성 채널에서 재생

## 폴더 구조

```
discord bot/
├── .env                    # 환경 변수 파일 (API 키, 토큰 등)
├── .git/                   # Git 저장소
├── index.js                # 메인 봇 파일
├── package.json            # 프로젝트 의존성 정보
├── package-lock.json       # 의존성 버전 정보
├── maple/                  # 메이플스토리 관련 기능
│   ├── mapleStroyAPI.js    # 메이플스토리 캐릭터 정보 API
│   └── noticeCrawling.js   # 메이플스토리 공지사항 크롤링
└── utils/                  # 유틸리티 기능
    ├── ai.js               # AI 응답 기능
    ├── clear.js            # 메시지 삭제 기능
    ├── interaction.js      # 상호작용 관련 기능
    └── tts.js              # 텍스트-음성 변환 기능
```

## 기술 스택

- **Discord.js**: Discord Bot API 라이브러리
- **@discordjs/voice**: 음성 채널 관련 기능
- **play-dl**: YouTube 음악 스트리밍
- **Google Generative AI**: AI 응답 생성 (Gemini API)
- **axios & cheerio**: 웹 크롤링
- **dotenv**: 환경 변수 관리

## 설정 방법

1. 레포지토리를 클론합니다.
2. `npm install`로 의존성을 설치합니다.
3. `.env` 파일을 생성하고 다음 항목을 설정합니다:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   OPENAI_API_KEY=your_gemini_api_key
   NEXON_API_KEY=your_nexon_api_key
   ```
4. `node index.js`로 봇을 실행합니다.

## 명령어 목록

| 명령어 | 설명 |
|--------|------|
| `!도움말` | 명령어 목록 표시 |
| `!play [노래 제목/URL]` | 음악 재생 |
| `!skip` | 현재 재생 중인 노래 건너뛰기 |
| `!stop` | 음악 재생 중지 |
| `!ai [질문]` | AI에게 질문하기 |
| `!tts [텍스트]` | 텍스트를 음성으로 변환 |
| `!name [캐릭터명]` | 메이플스토리 캐릭터 정보 검색 |
| `!noti` | 메이플스토리 공지 알림 설정 |
| `!ns` | 공지 알림 설정 해제 |
| `!clear [숫자]` | 지정된 개수의 메시지 삭제 |
| `!userclear @유저 [숫자]` | 특정 유저의 메시지 삭제 |

## 주의사항

- 이 봇을 사용하려면 Discord 개발자 포털에서 봇을 생성하고 적절한 권한을 부여해야 합니다.
- Nexon Open API, Google Generative AI API의 사용량 제한에 주의하세요.
