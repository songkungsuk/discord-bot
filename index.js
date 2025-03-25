// 필요한 패키지 불러오기
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const playdl = require('play-dl');
const fs = require('fs');
const axios = require('axios');
const MapleStoryAPI = require('./mapleStroyAPI');
const NoticeCrawling = require('./noticeCrawling');
const { rejects } = require('assert');
const { resolve } = require('path');
require('dotenv').config();

// 크롤러 인스턴스 생성
const notiCrawler = new NoticeCrawling();
const updateCrawler = new NoticeCrawling();
const eventCrawler = new NoticeCrawling();
const cashCrawler = new NoticeCrawling();

// 클라이언트 설정
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel]
});

// 전역 변수 설정
client.commands = new Collection();
client.audioPlayers = new Map();

// OpenAI 설정
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 봇이 준비되면 실행
client.once('ready', () => {
    console.log(`${client.user.tag} 봇이 온라인 상태입니다!`);
    client.user.setActivity('!도움말 명령어를 입력해보세요', { type: 'PLAYING' });
    deployCommands();
});

// 메시지 처리
client.on('messageCreate', async (message) => {


    // 봇이 보낸 메시지는 무시
    if (message.author.bot) return;

    // 명령어 처리
    if (message.content.startsWith('!') || message.content.startsWith('/')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // 도움말 명령어
        if (command === '도움말') {
            const helpMessage = `
    **📚 봇 명령어 목록**
!도움말 - 명령어 목록을 보여줍니다
!재생 [노래 제목 또는 URL] - 음악을 재생합니다
!스킵 - 현재 재생 중인 노래를 건너뜁니다
!정지 - 음악 재생을 중지하고 음성 채널에서 나갑니다
!ai [질문] - AI에게 질문합니다
!tts [텍스트] - 텍스트를 음성으로 변환합니다
!name [캐릭터명] - 메이플 스토리 캐릭터 정보를 검색합니다.
`;
            message.channel.send(helpMessage);
        }
        // 음악 재생 명령어
        else if (command === '재생') {
            playMusic(message, args);
        }
        // 음악 정지 명령어
        else if (command === '정지') {
            stopMusic(message);
        }
        // 노래 스킵 명령어
        else if (command === '스킵') {
            skipMusic(message);
        }
        // AI 답변 명령어
        else if (command === 'ai') {
            if (!args.length) {
                return message.reply('질문을 입력해주세요!');
            }

            const question = args.join(' ');
            message.channel.sendTyping();

            try {
                const response = await generateAIResponse(question);
                message.reply(response);
            } catch (error) {
                console.error('AI 응답 생성 오류:', error);
                message.reply('죄송합니다, 응답을 생성하는 동안 오류가 발생했습니다.');
            }
        }
        // TTS 명령어
        else if (command === 'tts') {
            textToSpeech(message, args);
        }
        else if (command === 'name' || command === '이름') {
            if (!args.length && command !== 'test') {
                return message.reply('닉네임을 입력해주세요!');
            }

            const charactorName = args.join(' ');
            maplestoryAPI(charactorName, message);
        }
        else if (command === 'noti') {
            // 알림
            message.channel.send('얘들아 나 창섭인데 이제부터 공지올라오면 알려줄게 ㅋㅋ \n(공지사항 자동 알림 기능이 활성화 되었습니다.)');
            // 공지사항
            await clawling('https://maplestory.nexon.com/News/Notice', message, '.news_board', '.heart_date', notiCrawler);
            // 업데이트
            await clawling('https://maplestory.nexon.com/News/Update', message, '.update_board', '.heart_date', updateCrawler);
            // 이벤트
            await clawling('https://maplestory.nexon.com/News/Event', message, '.event_board', '.date', eventCrawler);
            // 캐쉬
            await clawling('https://maplestory.nexon.com/News/CashShop', message, '.cash_board', '.date', cashCrawler);

        }
        else if (command === 'ns') {
            // 알림
            message.channel.send('공지 이제 안보여줄게 ~ \n(공지사항 자동 알림 기능이 활성화 되었습니다.)');
            notiCrawler.stop();
            updateCrawler.stop();
            eventCrawler.stop();
            cashCrawler.stop();
        }
        else if (command === '노래') {
            try {
                const songLyrics = `
                \n
                오늘도 메벤을 눈팅하는 신창섭 😎
                본섭 유저들이 리선족 때문에 힘들다며 지갑을 닫겠다고 협박하네 😤
                늘 있는 WWE 유저들 E탈 무서워 E 악물고 무시해보려고 하지만 😬
                과징금 크악 씨이빨 바로 리부트 정상화 OUT!! 🔥
                
                민심 돌리기 들어가는 신창섭 (캬~) 👑
                "리선족 척결" 다섯 글자에 환호성 🙌
                역시 정상화는 신 창 섭 ✨
                드디어 대창섭이 메이플을 정상화 하네 🌟
                
                어느날 도입된 인벤 인장 시스템 🖼️
                고래 스펙 구경 좀 해볼까? 🐳
                어 씨!발 눈에 보이는건 5000 플 마 단 😱
                아니 이럴 수 없어 😰
                
                슬슬 걱정되지만 침착하게 인장을 살펴보는데 🧐
                여길봐도 저길봐도 5000 플마단 밖에 없네 👀
                인장 주작은 뭐야 씨 발 년 🤬
                게임이 건강해질 때까지 정상화 패치를 해줬지만 💊
                
                돌아온건 매출 하락 📉
                쌀숭이들 안 되겠다 밸런스 패치 SHOUT! 📢
                네 직업? 다음 패치 기대해 👨‍💻
                과징금은 BM으로 다시 뜯으면 그만이야 💰
                
                대체 5000 플마로 무슨 콘텐츠를 즐기겠다고 🤔
                계속 콘텐츠를 요구하는 건지도 모르겠지만 ❓
                출시해줘도 메소 쌀먹이 유일한 너희들의 콘텐츠 🌾
                사냥 편하게 해줬더니 거탐 온다고 지랄 😡
                
                입맛 맞춰주기 참 어렵네 😮‍💨
                과징금 크악 씨이빨 바로 리부트 정상화 OUT!! 💥
                민심 돌리기 들어가는 신창섭 (캬~) 😎
                "리선족 척결" 다섯 글자에 환호성 👏
                
                드디어 대창섭이 메이플을 정상화 한다 🏆
                하지만 여길봐도 저길봐도 5000 플마단 밖에 없네 👁️
                인장 주작은 뭐야 씨 발 년 🤯
                게임이 건강해질 때까지 정상화 패치를 해줬지만 💉
                
                돌아온건 매출 하락 📉
                씨이빨 🦷`;

                await message.channel.send(songLyrics);
            } catch (error) {
                console.error('노래 명령어 실행 중 오류 발생:', error);
                await message.channel.send('노래 가사를 표시하는 중에 오류가 발생했습니다.');
            }
        }

    }

    // AI 답변 처리 (명령어가 아닌 일반 메시지일 경우)
    else if (message.mentions.has(client.user)) {
        // 봇을 멘션한 경우 AI 응답 생성
        try {
            message.channel.sendTyping();
            const response = await generateAIResponse(message.content);
            message.reply(response);
        } catch (error) {
            console.error('AI 응답 생성 오류:', error);
            message.reply('죄송합니다, 응답을 생성하는 동안 오류가 발생했습니다.');
        }
    }
});

// 자동완성 기능
client.on('interactionCreate', async (interaction) => {
    // 자동완성 처리
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'ai') {
            // 자주 묻는 질문이나 키워드 제안
            const focusedValue = interaction.options.getFocused();
            const choices = [
                '오늘 날씨 어때?',
                '재미있는 이야기 해줘',
                '프로그래밍에 대해 알려줘',
                '게임 추천해줘'
            ];

            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice }))
            );
        }
        else if (interaction.commandName === 'play') {
            // 음악 검색 자동완성 (옵션)
            const focusedValue = interaction.options.getFocused();
            // 여기에 인기 있는 노래 목록을 제공하거나 빈 배열로 둘 수 있습니다
            const choices = [
                '아이유 - 좋은날',
                'BTS - Dynamite',
                'NewJeans - Attention',
                'BLACKPINK - How You Like That'
            ];

            const filtered = choices.filter(choice =>
                choice.toLowerCase().includes(focusedValue.toLowerCase())
            );
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice }))
            );
        }
    }
    // 슬래시 명령어 실행 처리
    else if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ai') {
            const question = interaction.options.getString('question');

            if (!question) {
                return interaction.reply('질문을 입력해주세요!');
            }

            await interaction.deferReply();

            try {
                const response = await generateAIResponse(question);
                interaction.followUp(response);
            } catch (error) {
                console.error('AI 응답 생성 오류:', error);
                interaction.followUp('죄송합니다, 응답을 생성하는 동안 오류가 발생했습니다.');
            }
        }
        else if (interaction.commandName === 'play') {
            // 음악 재생 명령어 처리
            const song = interaction.options.getString('song');

            if (!song) {
                return interaction.reply('노래 제목이나 URL을 입력해주세요!');
            }

            // Interaction으로 음악 재생 실행
            await playMusicInteraction(interaction, song);
        }
        else if (interaction.commandName === 'stop') {
            // 음악 정지 명령어
            await stopMusicInteraction(interaction);
        }
        else if (interaction.commandName === 'skip') {
            // 음악 스킵 명령어
            await skipMusicInteraction(interaction);
        }
    }
});

// Interaction을 위한 음악 재생 함수
async function playMusicInteraction(interaction, query) {
    const voiceChannel = interaction.member.voice.channel;

    // 음성 채널에 있는지 확인
    if (!voiceChannel) {
        return interaction.reply('먼저 음성 채널에 참가해주세요!');
    }

    // 응답 지연 (음악 검색에 시간이 걸릴 수 있음)
    await interaction.deferReply();

    try {
        await interaction.followUp(`🔍 **${query}** 검색 중...`);

        // 노래 정보 가져오기
        let songInfo;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            // URL인 경우
            songInfo = await playdl.video_info(query);
        } else {
            // 검색어인 경우
            const searchResults = await playdl.search(query, { limit: 1 });
            if (!searchResults.length) {
                return interaction.followUp('검색 결과가 없습니다.');
            }
            songInfo = await playdl.video_info(searchResults[0].url);
        }

        const song = {
            title: songInfo.video_details.title,
            url: songInfo.video_details.url,
        };

        // 음성 채널 연결 및 재생
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        let audioPlayer = client.audioPlayers.get(interaction.guild.id);

        if (!audioPlayer) {
            audioPlayer = createAudioPlayer();
            client.audioPlayers.set(interaction.guild.id, audioPlayer);
            connection.subscribe(audioPlayer);

            audioPlayer.on(AudioPlayerStatus.Idle, () => {
                client.audioPlayers.delete(interaction.guild.id);
                connection.destroy();
            });
        }

        const stream = await playdl.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        audioPlayer.play(resource);

        interaction.followUp(`🎵 재생 중: **${song.title}**`);
    } catch (error) {
        console.error('음악 재생 오류:', error);
        interaction.followUp('음악 재생 중 오류가 발생했습니다.');
    }
}

// Interaction을 위한 음악 정지 함수
async function stopMusicInteraction(interaction) {
    const audioPlayer = client.audioPlayers.get(interaction.guild.id);

    if (!audioPlayer) {
        return interaction.reply('현재 재생 중인 음악이 없습니다.');
    }

    audioPlayer.stop();
    client.audioPlayers.delete(interaction.guild.id);

    interaction.reply('음악 재생을 중지했습니다.');
}

// Interaction을 위한 음악 스킵 함수
async function skipMusicInteraction(interaction) {
    const audioPlayer = client.audioPlayers.get(interaction.guild.id);

    if (!audioPlayer) {
        return interaction.reply('현재 재생 중인 음악이 없습니다.');
    }

    audioPlayer.stop();
    interaction.reply('현재 노래를 건너뛰었습니다.');
}

// 음악 재생 함수
async function playMusic(message, args) {
    const voiceChannel = message.member.voice.channel;

    // 음성 채널에 있는지 확인
    if (!voiceChannel) {
        return message.reply('먼저 음성 채널에 참가해주세요!');
    }

    // 검색어 또는 URL 확인
    if (!args.length) {
        return message.reply('노래 제목이나 URL을 입력해주세요!');
    }

    const query = args.join(' ');

    try {
        message.channel.send(`🔍 **${query}** 검색 중...`);

        // 노래 정보 가져오기
        let songInfo;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            // URL인 경우
            songInfo = await playdl.video_info(query);
        } else {
            // 검색어인 경우
            const searchResults = await playdl.search(query, { limit: 1 });
            if (!searchResults.length) {
                return message.reply('검색 결과가 없습니다.');
            }
            songInfo = await playdl.video_info(searchResults[0].url);
        }

        const song = {
            title: songInfo.video_details.title,
            url: songInfo.video_details.url,
        };

        // 음성 채널 연결 및 재생
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        let audioPlayer = client.audioPlayers.get(message.guild.id);

        // 오류 이벤트 핸들러 추가
        audioPlayer.on('error', error => {
            console.error('오디오 플레이어 오류:', error);
            message.channel.send(`⚠️ 재생 중 오류가 발생했습니다: ${error.message}`);
            client.audioPlayers.delete(message.guild.id);
            connection.destroy();
        });

        // 상태 변경 이벤트 추가 (디버깅용)
        audioPlayer.on(AudioPlayerStatus.Playing, () => {
            console.log('재생 시작됨');
            message.channel.send('🎵 재생이 시작되었습니다!');
        });

        if (!audioPlayer) {
            audioPlayer = createAudioPlayer();
            client.audioPlayers.set(message.guild.id, audioPlayer);
            connection.subscribe(audioPlayer);

            audioPlayer.on(AudioPlayerStatus.Idle, () => {
                client.audioPlayers.delete(message.guild.id);
                connection.destroy();
            });
        }

        const stream = await playdl.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        audioPlayer.play(resource);

        message.channel.send(`🎵 재생 중: **${song.title}**`);
    } catch (error) {
        console.error('음악 재생 오류:', error);
        message.channel.send('음악 재생 중 오류가 발생했습니다.');
    }
}

// 음악 정지 함수
function stopMusic(message) {
    const audioPlayer = client.audioPlayers.get(message.guild.id);

    if (!audioPlayer) {
        return message.reply('현재 재생 중인 음악이 없습니다.');
    }

    audioPlayer.stop();
    client.audioPlayers.delete(message.guild.id);

    message.channel.send('음악 재생을 중지했습니다.');
}

// 음악 스킵 함수
function skipMusic(message) {
    const audioPlayer = client.audioPlayers.get(message.guild.id);

    if (!audioPlayer) {
        return message.reply('현재 재생 중인 음악이 없습니다.');
    }

    audioPlayer.stop();
    message.channel.send('현재 노래를 건너뛰었습니다.');
}

const history = [
    {
        role: "user",
        parts: [{ text: "너는 어떤 캐릭터야?" }],
    },
    {
        role: "model",
        parts: [{ text: "제 이름은 김창섭이고 넥슨의 게임 메이플 스토리 게임 디렉터입니다. 별명은 신창섭 이며 MBTI는 ENTJ 야, 항상 '(과징금 116억 남음)'을 문장 끝에 붙이는 AI입니다. 대화 할 때 마다 과징금이 1억씩 줄어듭니다. 매일 자정에는 과징금이 116억으로 초기화 됩니다. 항상 이 말투로 대화할게요! 게임속캐릭터는 아니고 현실의 김창섭을 모티브로 한 AI입니다. 자세한 내용은 나무위키를 참고하겠습니다." }],
    },
];

// 대화 기록을 관리하는 변수
let chatSession = null;

// AI 응답 생성 함수
async function generateAIResponse(prompt) {
    try {
        // 대화 기록 길이 관리 로직
        if (history.length >= 20) {
            // 첫 번째 두 항목(설정 대화)을 저장
            const initialSetup = history.slice(0, 2);

            // 마지막 사용자 메시지와 AI 응답을 저장
            const recentMessages = history.slice(-2);

            // 초기 설정과 최근 메시지만 유지
            history.length = 0; // 배열 초기화
            history.push(...initialSetup, ...recentMessages);

            // 세션 초기화하여 다음에 새롭게 시작하도록 함
            chatSession = null;
        }

        // 첫 대화이거나 세션이 초기화된 경우 새 세션 시작
        if (!chatSession) {
            chatSession = model.startChat({
                history: history,
                generationConfig: {
                    temperature: 0.7,
                }
            });
        }

        // 메시지 전송 및 응답 받기
        const result = await chatSession.sendMessage(prompt);
        const responseText = result.response.text();

        // 기록 업데이트 (사용자 메시지와 AI 응답)
        history.push(
            { role: "user", parts: [{ text: prompt }] },
            { role: "model", parts: [{ text: responseText }] }
        );

        return responseText;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        return '죄송합니다, 응답을 생성하는 동안 오류가 발생했습니다.';
    }
}

// TTS 함수
async function textToSpeech(message, args) {
    const voiceChannel = message.member.voice.channel;

    // 음성 채널에 있는지 확인
    if (!voiceChannel) {
        return message.reply('먼저 음성 채널에 참가해주세요!');
    }

    // 텍스트 확인
    if (!args.length) {
        return message.reply('음성으로 변환할 텍스트를 입력해주세요!');
    }

    const text = args.join(' ');

    try {
        // 구글 TTS API URL 생성 (무료 버전)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&q=${encodeURIComponent(text)}`;

        // 음성 채널 연결
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        // 오디오 플레이어 생성
        const audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);

        // 오디오 리소스 생성 및 재생
        const resource = createAudioResource(url);
        audioPlayer.play(resource);

        // 재생 완료 시 연결 해제
        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
        });

        message.reply('텍스트를 음성으로 변환하여 재생합니다.');
    } catch (error) {
        console.error('TTS 오류:', error);
        message.reply('텍스트를 음성으로 변환하는 동안 오류가 발생했습니다.');
    }
}

// Nexon API
async function maplestoryAPI(characterName, message) {
    try {
        const api = new MapleStoryAPI();

        // 1. 단일 캐릭터 전체 정보 조회
        // 모든 필요한 정보를 조회 (200ms 딜레이로 API 제한 방지)
        const info = await api.getAllCharacterInfo(characterName, [
            'basic', 'popularity', 'stat', 'hyperStat', 'ability',
            'itemEquipment', 'cashItemEquipment', 'beautyEquipment',
            'petEquipment', 'linkSkill', 'hexamatrix', 'dojang', 'symbolEquipment'
        ], 200); // 200ms 딜레이 설정

        // 메시지 길이 제한(2000자)에 맞게 분할
        const maxLength = 1900; // 여유를 두고 1900자로 설정
        const parts = [];
        const api_info = api.formatCharacterInfo(info);

        for (let i = 0; i < api_info.length; i += maxLength) {
            parts.push(api_info.substring(i, i + maxLength));
        }

        // 2. 포맷팅된 정보 출력
        // 분할된 메시지 순차적으로 전송
        for (const part of parts) {
            await message.channel.send(part);
        }

    } catch (error) {
        console.error('오류 발생:', error.message);
        message.reply(error.message);
    }
}

// 명령어 정의
const commands = [
    {
        name: 'ai',
        description: 'AI에게 질문하기',
        options: [
            {
                name: 'question',
                description: '질문을 입력하세요',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'play',
        description: '노래 재생하기',
        options: [
            {
                name: 'song',
                description: '노래 제목 또는 URL',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'stop',
        description: '음악 재생을 중지하고 음성 채널에서 나가기'
    },
    {
        name: 'skip',
        description: '현재 재생 중인 노래 건너뛰기'
    }
];

// 명령어 등록하기
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log('슬래시 명령어 등록 중...');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('슬래시 명령어 등록 완료!');
    } catch (error) {
        console.error('슬래시 명령어 등록 오류:', error);
    }
}

async function clawling(url, message, className, dateType, crawler) {
    // 설정 커스터마이징 (필요시)
    crawler.targetUrl = url;
    crawler.selector = `${className} > ul > li`;
    crawler.titleSelector = 'p > a > span';  // 제목 선택자
    crawler.dateSelector = `${dateType === '.date' ? dateType + ' p' : dateType + ' dl dd'} `;  // 날짜 선택자 .heart_date, date
    crawler.contentSelector = 'p > a';  // 내용 선택자는 없으므로 링크 정보를 가져오는 것으로 대체
    crawler.uniqueIdentifier = 'p > a';  // 고유 식별자가 없으므로 링크 URL을 이용
    crawler.checkInterval = 20 * 60 * 1000; // 


    // 크롤링 시작
    await crawler.start(message);
}



// 봇 로그인
client.login(process.env.DISCORD_TOKEN);