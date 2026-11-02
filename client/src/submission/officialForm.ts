export const officialSourceUrl =
  "https://www.moel.go.kr/local/incheonbukbu/news/notice/noticeView.do?bbs_seq=20190700528";
export const officialTemplatePath = "/forms/moel-standard-resume.pdf";
export const officialFields = [
  ["address", "주소 및 우편번호", 100],
  ["telephone", "전화번호", 22],
  ["mobile", "휴대전화", 22],
  ["qualification1", "관련 자격증 1", 16],
  ["qualificationDate1", "자격증 1 취득 연월", 18],
  ["qualification2", "관련 자격증 2", 16],
  ["qualificationDate2", "자격증 2 취득 연월", 18],
  ["specialty", "특기사항", 55],
  ["veteranNumber", "취업지원 대상 보훈번호", 50],
  ["disabilityType", "장애종별", 8],
  ["disabilityDegree", "장애 정도", 12],
  ["disabilityNumber", "장애인 등록번호", 24],
  ["basicLivelihood", "국민기초생활보장법상 수급자 해당 여부", 18],
  ["singleParent", "한부모가족지원법상 보호대상자 해당 여부", 18],
] as const;
export type OfficialDetails = Partial<
  Record<(typeof officialFields)[number][0], string>
>;
export const cleanFormText = (text: string) =>
  text.replace(/\s*[·ㆍ‧․]\s*/g, ", ");
export function introductionBreak(text: string) {
  if (text.length <= 180) return text.length;
  const head = text.slice(0, 180);
  const sentence = head.lastIndexOf(". ");
  if (sentence >= 0) return sentence + 1;
  const space = Math.max(head.lastIndexOf(" "), head.lastIndexOf("\n"));
  return space > 0 ? space : 180;
}
export const shortIntroduction = (text: string) => {
  const end = introductionBreak(text);
  const head = text.slice(0, end).replace(/\s+/g, " ");
  return end < text.length ? `${head}\n(다음 쪽에 계속)` : head;
};
