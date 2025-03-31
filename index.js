// 필요한 패키지 불러오기

const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
// 음악
const play = require('play-dl');
// ai
const OpenAI = require("openai");
// Maple
const MapleStoryAPI = require('./maple/mapleStroyAPI');
const NoticeCrawling = require('./maple/noticeCrawling');
// utils
const { generateAIResponse } = require('./utils/ai');
const { textToSpeech } = require('./utils/tts');
const { handleClearCommand, handleUserClearCommand} = require('./utils/clear');

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

// 음악 큐 설정
const queue = new Map();

// 메시지 처리
client.on('messageCreate', async (message) => {
    // 봇이 보낸 메시지는 무시
    if (message.author.bot) return;

    // 명령어 처리
    if (message.content.startsWith('!') || message.content.startsWith('/')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const serverQueue = queue.get(message.guild.id);

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
!noti [공지 알림 설정] - 메이플 스토리 홈페이지에 새로운 공지가 나온 경우 알려줍니다.
!ns [공지 알림 설정 해제] - 공지 알림 설정을 해제 합니다
`;
            message.channel.send(helpMessage);
        }
        // 음악 재생 명령어
        else if (command === 'play') {
            if (!message.member.voice?.channel) return message.channel.send('Connect to a Voice Channel')

            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            })

            let arguments = message.content.split('play ')[1].split(' ')[0]

            let stream = await play.stream(arguments);

            /*
            OR if you want to get info about youtube link and then stream it
    
            let yt_info = await play.video_info(args)
            console.log(yt_info.video_details.title) 
            let stream = await play.stream_from_info(yt_info)
            */

            let resource = createAudioResource(stream.stream, {
                inputType: stream.type
            })

            let player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            })

            player.play(resource);

            connection.subscribe(player);

            player.on('error', console.error);
            player.on('stateChange', (oldState, newState) => {
                message.channel.send(`🔄 Audio player transitioned from ${oldState.status} to ${newState.status}`); console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
            });
            //playMusic(message, args);
        }
        // 음악 정지 명령어
        else if (command === 'stop') {
            stopMusic(message);
        }
        // 노래 스킵 명령어
        else if (command === 'skip') {
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
                message.reply('죄송합니다, 응답을 생성하는 동안 오류가 발생했습니다.');
                console.error('AI 응답 생성 오류:', error);
            }
        }
        else if (command === 'clear' || command === '청소') {
            handleClearCommand(message, args);
        }
        else if (command === 'userclear' || command === '유저청소') {
            handleUserClearCommand(message, args);
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
        // 알림
        else if (command === 'noti') {
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
        // 알림 해제
        else if (command === 'ns') {

            message.channel.send('공지 이제 안보여줄게 ~ \n(공지사항 자동 알림 기능이 활성화 되었습니다.)');
            notiCrawler.stop();
            updateCrawler.stop();
            eventCrawler.stop();
            cashCrawler.stop();
        }
        else if (command === 'star') {
          
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

// playMusic 함수
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
            songInfo = await play.video_info(query);
        } else {
            // 검색어인 경우
            const searchResults = await play.search(query, { limit: 1 });
            if (!searchResults.length) {
                return message.reply('검색 결과가 없습니다.');
            }
            songInfo = await play.video_info(searchResults[0].url);
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        });

        let stream = await play.stream(query)

        /*
        OR if you want to get info about youtube link and then stream it

        let yt_info = await play.video_info(args)
        console.log(yt_info.video_details.title) 
        let stream = await play.stream_from_info(yt_info)
        */

        let resource = createAudioResource(stream.stream, {
            inputType: stream.type
        })

        let player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        })

        player.on('error', console.error);
        player.on('stateChange', (oldState, newState) => {
            message.channel.send(`🔄 Audio player transitioned from ${oldState.status} to ${newState.status}`); console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
        });

        player.play(resource);
        connection.subscribe(player);
    } catch (error) {
        console.error('음악 재생 오류:', error);
        message.channel.send(`음악 재생 중 오류가 발생했습니다: ${error.message}`);
    }
}



// -------------------------------------------------------------------------------------------------------------------------------------------------------------


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
    crawler.titleSelector = `${className === '.event_board'? '.event_listMt' : 'p > a > span'}`;  // 제목 선택자
    crawler.dateSelector = `${dateType === '.date' ? dateType + ' p' : dateType + ' dl dd'} `;  // 날짜 선택자 .heart_date, date
    crawler.contentSelector = 'p > a';  // 내용 선택자는 없으므로 링크 정보를 가져오는 것으로 대체
    crawler.uniqueIdentifier = 'p > a';  // 고유 식별자가 없으므로 링크 URL을 이용
    crawler.checkInterval = 20 * 60 * 1000; // 


    // 크롤링 시작
    await crawler.start(message);
}

client.on('ready', async () => {
    await setup();
    await sendBotEventMsg('931410650507403307', `${client.user.tag.substring(0, client.user.tag.indexOf('#'))} 디렉터가 온라인 상태입니다!`);
    deployCommands();
});

// 봇이 연결 끊겼을 때 (인터넷 연결 문제 등으로 인한 연결 끊김)
client.on('disconnect', (event) => {
    sendBotEventMsg('931410650507403307', `${client.user.tag.substring(0, client.user.tag.indexOf('#'))} 디렉터가 서버점검 하러 가신 상태입니다!`);
});

process.on('SIGINT', async () => {

    await sendBotEventMsg('931410650507403307', `${client.user.tag.substring(0, client.user.tag.indexOf('#'))} 디렉터가 서버점검 하러 가신 상태입니다!`);
    // 필요한 정리 작업 수행
    // 예: 데이터베이스 연결 종료, 캐시 저장 등

    // Discord 클라이언트 연결 종료
    client.destroy();
    console.log('봇이 안전하게 종료되었습니다.');
    process.exit(0); // 정상 종료 코드 (0)
});

function sendBotEventMsg(channelId, msg) {
    return new Promise((resolve, reject) => {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            console.log(msg);
            channel.send(msg)
                .then(() => resolve())
                .catch(err => reject(err));
        } else {
            reject(new Error(`채널 ID ${channelId}를 찾을 수 없습니다.`));
        }
    });
}

async function setup() {
    await play.setToken({
        youtube: {
            cookie: `LOGIN_INFO=AFmmF2swRQIgWRMVMKnhlYUnB32hyE2Wa_aLQMTH4Rnj2zgAjz8zP4YCIQDMXP4QnzIA7_AUqPtn0nUY1wNWfz7ZGv4VvN7LhKorJw:QUQ3MjNmeTNBY0p0WGNuN1lHaHB0Ry1IUlpsc0w2dzhsS2s4eF9iTUVqSENiSXJTbERfaHBKNkVoT1NEVVlnZG5LT1Fhc19ieTRESXhWdmc3cEZ4SUtrUFRMRTVLczhJeVI5Wm9HRjQ3bkRJN3kyM3ZZaVlvbFFEc2o3WllGREsteFNaT0FBeTREMk1tMmY3QnpkRXh5YmRxLS1WaHZiUEF3; HSID=AuikuULcJkZZbQS5y; SSID=AEEt0Bh3gHeVsRuoq; APISID=x3K9Nth-u4iV3bL2/AjRLSnCPaiXpO4C1s; SAPISID=6moc0Ta1GZnr86Zn/APO8ZpUixioQHPL5P; __Secure-1PAPISID=6moc0Ta1GZnr86Zn/APO8ZpUixioQHPL5P; __Secure-3PAPISID=6moc0Ta1GZnr86Zn/APO8ZpUixioQHPL5P; VISITOR_INFO1_LIVE=Xkl2FmCDZJc; VISITOR_PRIVACY_METADATA=CgJLUhIEGgAgSw%3D%3D; __Secure-1PSIDTS=sidts-CjEBEJ3XV5MPA0gzSoZ3nl-80r1f4CERqInHHkuw4USENq2CybBo2GL2MW_P3GUbNxo0EAA; __Secure-3PSIDTS=sidts-CjEBEJ3XV5MPA0gzSoZ3nl-80r1f4CERqInHHkuw4USENq2CybBo2GL2MW_P3GUbNxo0EAA; __Secure-ROLLOUT_TOKEN=CPaQ_5qcqbafiQEQ4dHD_-bdiwMYlYyR6I6pjAM%3D; _gcl_au=1.1.1412149294.1743039144; PREF=f6=80&tz=Asia.Seoul&f5=30000&f7=100&repeat=NONE; SID=g.a000vQjdNm2O-c6-rrr1_tKzbuPV-RRtGjxxDNj_vkGVS5Wu7YqhlO1a_4q5odELrro1Z5QG_wACgYKAaQSARYSFQHGX2Mi970zF9d6n885tlW6CYe8dxoVAUF8yKqePJN_d7cAqjfkvqUD8UgB0076; __Secure-1PSID=g.a000vQjdNm2O-c6-rrr1_tKzbuPV-RRtGjxxDNj_vkGVS5Wu7YqhDSAFpwyJF-Q5rzKpBZgS4AACgYKAZgSARYSFQHGX2Mikp7jPcj5xy9d6A7aw5YKjxoVAUF8yKqRKAkYqIKGb3l3vxMpCIxP0076; __Secure-3PSID=g.a000vQjdNm2O-c6-rrr1_tKzbuPV-RRtGjxxDNj_vkGVS5Wu7YqhzpG-cMEHkkYtZ16VhrYcHwACgYKASMSARYSFQHGX2Mi5stO7XvcDWa-jwl_uMHK4BoVAUF8yKq8gMvrT80NNspKDWzJ_Zhn0076; YSC=7gHxyupB4YI; SIDCC=AKEyXzWNGdPmI1FL6ccPT-1_A97_qBp-AektVFq2P_vI-uUWNSDEy32s-Lwx7yl9Kjgz-XqEVw; __Secure-1PSIDCC=AKEyXzUw6l6VTrmMT1-hGCEe6Splc6iqm7LGlC5FtAZHmrdsV86-Ery0LXcb8jr4wG6FYPhrFow; __Secure-3PSIDCC=AKEyXzWuyuT-47Sv3hm0_vxQSBN4F0S_cy3Gx47AqrN1l5OUr2jcwqKCeBJdhJFdycoCF9SOUuQ`
        }
    });
}

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);