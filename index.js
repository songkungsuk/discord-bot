// 필요한 패키지 불러오기
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const playdl = require('play-dl');
const fs = require('fs');
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
});

// 메시지 처리
client.on('messageCreate', async (message) => {
  // 봇이 보낸 메시지는 무시
  if (message.author.bot) return;
  
  // 명령어 처리
  if (message.content.startsWith('!')) {
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

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);