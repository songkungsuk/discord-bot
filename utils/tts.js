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


module.exports = { textToSpeech }