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


module.exports = { playMusicInteraction, stopMusicInteraction, skipMusicInteraction }