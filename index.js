// 필요한 패키지 불러오기
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const playdl = require('play-dl');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

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


// Nexon API 설정
const baseUrl = 'https://open.api.nexon.com/maplestory/v1';
const nexonUrlList = [
    '/character/basic',
    '/character/popularity',
    '/character/stat',
    '/character/hyper-stat',
    '/character/propensity',
    '/character/ablility',
    '/character/item-equipment',
    '/character/cashitem-equipment',
    '/character/symbol-equipment',
    '/character/set-effect',
    '/character/beauty-equipment',
    '/character/android-equipment',
    '/character/pet-equpment',
    '/character/link-skill',
    '/character/vmatrix',
    '/character/hexamatrix',
    '/character/hexamatrix-stat',
    '/character/dojang',
]

async function getOcid(character_name, url = 'https://open.api.nexon.com/maplestory/v1/id?') {

    console.log(character_name);
    try {
        const response = await axios.get(url + 'character_name=' + character_name, {
            headers: {
                "x-nxopen-api-key": process.env.NEXON_API_KEY
            }
        });
        console.log(response);
        return response.data.ocid;
    } catch (error) {
        console.log(error);
    }
}

/**
 * 
 * @param {*} url  // url 
 * @param {*} ocid // use getOcid function
 */
async function getOcidInfo(ocid, url) {
    try {
        const response = await axios.get(baseUrl + url + '?ocid=' + ocid, {
            headers: {
                "x-nxopen-api-key": process.env.NEXON_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

async function getChacractorInfo(character_name, message) {
    try {
        const ocid = await getOcid(character_name);
        const basic = await getOcidInfo(ocid, nexonUrlList[0]);
        const popularity = await getOcidInfo(ocid, nexonUrlList[1]);
        // const stat = await getOcidInfo(ocid, nexonUrlList[2]);
        // const hyperStat = await getOcidInfo(ocid, nexonUrlList[3]);
        // const propensity = await getOcidInfo(ocid, nexonUrlList[4]);
        // const ablilty = await getOcidInfo(ocid, nexonUrlList[5]);
        // const itemEquipment = await getOcidInfo(ocid, nexonUrlList[6]);
        // const cashItemEquipment = await getOcidInfo(ocid, nexonUrlList[7]);
        // const symbolEquipment = await getOcidInfo(ocid, nexonUrlList[8]);
        // const setEffect = await getOcidInfo(ocid, nexonUrlList[9]);
        // const beautyEquipment = await getOcidInfo(ocid, nexonUrlList[10]);
        // const androidEquipment = await getOcidInfo(ocid, nexonUrlList[11]);
        // const petEquipment = await getOcidInfo(ocid, nexonUrlList[12]);
        // const linkSkill = await getOcidInfo(ocid, nexonUrlList[13]);
        // const vmatrix = await getOcidInfo(ocid, nexonUrlList[14]);
        // const hexamatrix = await getOcidInfo(ocid, nexonUrlList[15]);
        // const hexamatrixStat = await getOcidInfo(ocid, nexonUrlList[16]);
        // const dojang = await getOcidInfo(ocid, nexonUrlList[17]);

        // 나머지는 data를 직접 보면서 다루어야함 
        // `
        //     조회 날짜 ${basic.date}
        //     직업 : ${basic.character_class} / 월드 : ${basic.world_name} / 레벨 : ${basic.character_level}
        //     경험치 : ${basic.character_exp_rate} / 길드 : ${basic.character_guild_name} / 인기도 : ${popularity.popularity}
        //     ${basic.character_image}
        //     최근 7일간 로그인 : ${basic.access_flag ? '접속' : '미접속'}
        //     해방 퀘스트 클리어 여부 : ${basic.liberation_quest_clear_flag ? '완료' : '미완료'}
        // `
    } catch (error) {
        console.log(error);
        message.reply('서버가 점검중이거나 캐릭터가 존재하지 않습니다.');
    }

}

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
        else if (command === 'name' || command === '이름' || command === 'test') {
            if (!args.length && command !== 'test') {
                return message.reply('닉네임을 입력해주세요!');
            }

            let charactorName = args.join(' ');
            if(!charactorName){
                charactorName = '전한녁';
            }
            getChacractorInfo(charactorName, message);
        }

        console.log(message);
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

// AI 응답 생성 함수
async function generateAIResponse(prompt) {
    try {
        const completion = await model.generateContent(prompt);
        return completion.response.text();
    } catch (error) {
        console.error('OpenAI API 오류:', error);
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

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);