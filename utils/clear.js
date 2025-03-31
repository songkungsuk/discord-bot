// 메시지 삭제 명령어 핸들러
// !clear 또는 !청소 명령어로 호출, 숫자를 인자로 받아 해당 개수만큼 메시지 삭제
async function handleClearCommand(message, args) {
    // 관리자 권한 확인 (선택적)
    if (!message.member.permissions.has('MANAGE_MESSAGES')) {
        return message.reply('이 명령어를 사용할 권한이 없습니다.');
    }

    // 삭제할 메시지 수 파싱
    const deleteCount = parseInt(args[0]);

    // 유효한 숫자인지 확인 (1-100 사이)
    if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
        return message.reply('1부터 100 사이의 숫자를 입력해주세요.');
    }

    try {
        // 메시지 삭제 실행
        // 주의: bulkDelete는 2주 이내의 메시지만 삭제 가능 (Discord API 제한)
        const fetched = await message.channel.messages.fetch({ limit: deleteCount });
        await message.channel.bulkDelete(fetched);

        // 삭제 완료 메시지 전송 (몇 초 후 자동 삭제)
        await message.channel.send(`${deleteCount}개의 메시지를 삭제했습니다.`);
    } catch (error) {
        console.error('메시지 삭제 중 오류 발생:', error);
        message.reply('메시지 삭제 중 오류가 발생했습니다. 2주가 지난 메시지는 삭제할 수 없습니다.');
    }
}

// 특정 사용자의 메시지만 삭제하는 명령어 핸들러
// !userclear 또는 !유저청소 명령어로 호출, @멘션과 숫자를 인자로 받음
async function handleUserClearCommand(message, args) {
    // 관리자 권한 확인 (선택적)
    if (!message.member.permissions.has('MANAGE_MESSAGES')) {
        return message.reply('이 명령어를 사용할 권한이 없습니다.');
    }

    // 멘션된 사용자와 삭제할 메시지 수 파싱
    const user = message.mentions.users.first();
    const deleteCount = parseInt(args[1]) || 100; // 기본값 100

    if (!user) {
        return message.reply('삭제할 메시지의 사용자를 멘션해주세요. [사용방법 예시) "!userclear @한녁, 100"]');
    }

    if (deleteCount < 1 || deleteCount > 100) {
        return message.reply('1부터 100 사이의 숫자를 입력해주세요. [사용방법 예시) "!userclear @한녁, 100"]');
    }

    try {
        // 메시지 가져오기 (최대 100개)
        const fetched = await message.channel.messages.fetch({ limit: 100 });

        // 특정 사용자의 메시지만 필터링
        const userMessages = fetched.filter(msg => msg.author.id === user.id).first(deleteCount);

        if (userMessages.length === 0) {
            return message.reply('해당 사용자의 메시지를 찾을 수 없습니다.');
        }

        // 필터링된 메시지 삭제
        await message.channel.bulkDelete(userMessages);

        // 삭제 완료 메시지 전송 (몇 초 후 자동 삭제)
        await message.channel.send(`최근 100개의 메세지중 ${user.tag}의 메시지 ${userMessages.length}개를 삭제했습니다.`);
    } catch (error) {
        console.error('메시지 삭제 중 오류 발생:', error);
        message.reply('메시지 삭제 중 오류가 발생했습니다. 2주가 지난 메시지는 삭제할 수 없습니다.');
    }
}

module.exports = {handleClearCommand, handleUserClearCommand}