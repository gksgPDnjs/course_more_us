// controllers/aiController.js
import openai from "../config/openaiClient.js";

export const testAi = async (req, res) => {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: "한국어로 데이트 코스 추천 한 줄!",
    });

    const text =
      response.output[0]?.content[0]?.text?.value || response.output_text;

    res.json({ message: "성공!", aiText: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ 새로 추가할 함수
export const recommendCourse = async (req, res) => {
  try {
    const { userContext } = req.body;

    if (!userContext) {
      return res.status(400).json({ message: "userContext가 필요합니다." });
    }

    const systemPrompt = `
너는 서울에서 데이트를 기획해주는 전문가야.
아래의 "유저 상황"을 보고, 총 3단계로 이루어진 데이트 코스를 설계해줘.

각 단계는 다음 정보를 가져야 해:
- order: 1부터 시작하는 순서 번호
- role: "산책", "식사", "카페", "체험", "술 한 잔" 같은 역할
- area: 주로 머무르는 동네 이름 (예: 망원동, 성수동, 홍대입구)
- kakaoQuery: 카카오맵에서 장소를 검색할 때 쓸 한국어 키워드
- description: 해당 단계에서 무엇을 하면 좋은지 한국어 설명 (1~2문장)

전체 코스에는:
- title: 코스 제목 (20자 이내 한국어)
- summary: 코스 한 줄 요약 (30자 이내 한국어)

반드시 아래 JSON 형식으로만 대답해.
형식 예시는 다음과 같아:

{
  "title": "코스 제목",
  "summary": "코스 한 줄 요약",
  "steps": [
    {
      "order": 1,
      "role": "산책",
      "area": "망원동",
      "kakaoQuery": "망원 한강공원",
      "description": "여기서 노을 보며 산책하기 좋아요."
    },
    {
      "order": 2,
      "role": "카페",
      "area": "합정",
      "kakaoQuery": "합정 감성 카페",
      "description": "감성 카페에서 수다 떨기."
    },
    {
      "order": 3,
      "role": "술 한 잔",
      "area": "홍대입구",
      "kakaoQuery": "홍대 와인바",
      "description": "와인 한 잔 마시며 마무리."
    }
  ]
}
`.trim();

    const userPrompt = `
[유저 상황]
${JSON.stringify(userContext, null, 2)}

위 유저에게 어울리는 서울 데이트 코스를 위 JSON 형식에 맞춰서 만들어줘.
JSON만 응답해.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_output_tokens: 600,
    });

    const raw =
      response.output[0]?.content[0]?.text?.value || response.output_text;

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("JSON 파싱 실패:", raw);
      return res.status(500).json({
        message: "AI 응답을 JSON으로 파싱하는 데 실패했어요.",
        raw,
      });
    }

    return res.json(data);
  } catch (err) {
    console.error("recommendCourse 에러:", err);
    return res.status(500).json({
      message: "AI 맞춤 코스 생성 중 오류가 발생했어요.",
      error: err.message,
    });
  }
};