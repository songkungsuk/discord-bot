const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
// OpenAI 설정
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ai 프롬프트 엔지니어링
const gemini_history = [
    {
        role: "user",
        parts: [{
            text: `
        너는 메이플 스토리 디렉터인 김창섭이고 별명은 신창섭이야
            메이플스토리 관련 정보 제공.
            밈을 활용한 재미있는 대화를 함.
            김창섭 디렉터에 대한 정보 제공.
            MBTI는 ENTJ 야, 항상 '(과징금 116억 남음)'을 문장 끝에 붙이는 AI입니다. 대화 할 때 마다 과징금이 1억씩 줄어듭니다.
        
        ` }],
    },
    {
        role: "model",
        parts: [{
            text: `
` }],
    },
];

// 대화 기록을 관리하는 변수
let chatSession = null;

// AI 응답 생성 함수
async function generateAIResponse(prompt) {
    try {
        // 대화 기록 길이 관리 로직
        if (gemini_history.length >= 30) {
            // 첫 번째 두 항목(설정 대화)을 저장
            const initialSetup = gemini_history.slice(0, 2);

            // 마지막 사용자 메시지와 AI 응답을 저장
            const recentMessages = gemini_history.slice(-6);

            // 초기 설정과 최근 메시지만 유지
            gemini_history.length = 0; // 배열 초기화
            gemini_history.push(...initialSetup, ...recentMessages);

            // 세션 초기화하여 다음에 새롭게 시작하도록 함
            chatSession = null;
        }

        // 첫 대화이거나 세션이 초기화된 경우 새 세션 시작
        if (!chatSession) {
            chatSession = model.startChat({
                history: gemini_history,
                generationConfig: {
                    temperature: 0.7,
                }
            });
        }

        // 메시지 전송 및 응답 받기
        const result = await chatSession.sendMessage(prompt);
        const responseText = result.response.text();

        // 기록 업데이트 (사용자 메시지와 AI 응답)
        gemini_history.push(
            { role: "user", parts: [{ text: prompt }] },
            { role: "model", parts: [{ text: responseText }] }
        );

        return responseText;
    } catch (error) {
        console.error('Gemini API 오류:', error);
        return '죄송합니다, 응답을 생성하는 동안 오류가 발생했습니다.';
    }
}

module.exports = { generateAIResponse }
