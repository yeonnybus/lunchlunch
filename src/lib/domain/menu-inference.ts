import { canonicalizeMenuLabel, normalizeText } from "@/lib/domain/menu-synonyms";
import type { Json } from "@/lib/supabase/types";

const menuAliasToCanonical: Array<{ alias: string; canonical: string }> = [
  { alias: "와퍼", canonical: "햄버거" },
  { alias: "빅맥", canonical: "햄버거" },
  { alias: "치즈버거", canonical: "햄버거" },
  { alias: "치킨버거", canonical: "햄버거" },
  { alias: "수제버거", canonical: "햄버거" },
  { alias: "햄버거", canonical: "햄버거" },
  { alias: "버거", canonical: "햄버거" },
  { alias: "스시", canonical: "초밥" },
  { alias: "초밥", canonical: "초밥" },
  { alias: "사케동", canonical: "돈부리" },
  { alias: "가츠동", canonical: "돈부리" },
  { alias: "규동", canonical: "돈부리" },
  { alias: "돈부리", canonical: "돈부리" },
  { alias: "우동", canonical: "우동" },
  { alias: "소바", canonical: "우동" },
  { alias: "냉모밀", canonical: "우동" },
  { alias: "라멘", canonical: "라멘" },
  { alias: "짜장", canonical: "짜장면" },
  { alias: "자장", canonical: "짜장면" },
  { alias: "짜장면", canonical: "짜장면" },
  { alias: "짬뽕", canonical: "짬뽕" },
  { alias: "마라탕", canonical: "마라탕" },
  { alias: "마라샹궈", canonical: "마라샹궈" },
  { alias: "제육", canonical: "제육볶음" },
  { alias: "제육볶음", canonical: "제육볶음" },
  { alias: "국밥", canonical: "국밥" },
  { alias: "김치찌개", canonical: "김치찌개" },
  { alias: "된장찌개", canonical: "된장찌개" },
  { alias: "순두부", canonical: "순두부찌개" },
  { alias: "칼국수", canonical: "칼국수" },
  { alias: "쌀국수", canonical: "쌀국수" },
  { alias: "분짜", canonical: "분짜" },
  { alias: "반미", canonical: "반미" },
  { alias: "월남쌈", canonical: "월남쌈" },
  { alias: "파스타", canonical: "파스타" },
  { alias: "알리오", canonical: "파스타" },
  { alias: "까르보", canonical: "파스타" },
  { alias: "라자냐", canonical: "파스타" },
  { alias: "리조또", canonical: "리조또" },
  { alias: "피자", canonical: "피자" },
  { alias: "마르게리타", canonical: "피자" },
  { alias: "돈까스", canonical: "돈까스" },
  { alias: "돈카츠", canonical: "돈까스" },
  { alias: "샐러드", canonical: "샐러드" },
  { alias: "김밥", canonical: "김밥" },
  { alias: "치킨", canonical: "치킨" },
  { alias: "비빔밥", canonical: "비빔밥" },
  { alias: "덮밥", canonical: "돈부리" },
  { alias: "백반", canonical: "백반" },
  { alias: "정식", canonical: "백반" },
  { alias: "냉면", canonical: "냉면" },
  { alias: "라면", canonical: "라멘" },
  { alias: "부대찌개", canonical: "부대찌개" },
  { alias: "샌드위치", canonical: "샌드위치" },
  { alias: "브런치", canonical: "브런치" },
  { alias: "족발", canonical: "족발" },
  { alias: "보쌈", canonical: "보쌈" },
  { alias: "곰탕", canonical: "곰탕" },
  { alias: "설렁탕", canonical: "설렁탕" },
  { alias: "삼겹살", canonical: "삼겹살" },
  { alias: "갈비", canonical: "갈비" },
  { alias: "불고기", canonical: "불고기" },
  { alias: "훠궈", canonical: "훠궈" },
  { alias: "탕수육", canonical: "탕수육" },
  { alias: "딤섬", canonical: "딤섬" },
];

const categorySeedRules: Array<{ keyword: string; menus: string[] }> = [
  { keyword: "햄버거", menus: ["햄버거"] },
  { keyword: "일식", menus: ["초밥", "우동"] },
  { keyword: "우동", menus: ["우동"] },
  { keyword: "라멘", menus: ["라멘"] },
  { keyword: "중식", menus: ["짜장면", "짬뽕"] },
  { keyword: "마라", menus: ["마라탕"] },
  { keyword: "한식", menus: ["국밥", "김치찌개"] },
  { keyword: "국밥", menus: ["국밥"] },
  { keyword: "찌개", menus: ["김치찌개"] },
  { keyword: "베트남", menus: ["쌀국수", "분짜"] },
  { keyword: "쌀국수", menus: ["쌀국수"] },
  { keyword: "양식", menus: ["파스타", "피자"] },
  { keyword: "이탈리아", menus: ["파스타", "피자"] },
  { keyword: "파스타", menus: ["파스타"] },
  { keyword: "돈까스", menus: ["돈까스"] },
  { keyword: "샐러드", menus: ["샐러드"] },
  { keyword: "분식", menus: ["김밥", "떡볶이"] },
  { keyword: "백반", menus: ["백반"] },
  { keyword: "한정식", menus: ["백반", "불고기"] },
  { keyword: "냉면", menus: ["냉면"] },
  { keyword: "라면", menus: ["라멘"] },
  { keyword: "샌드위치", menus: ["샌드위치"] },
  { keyword: "브런치", menus: ["브런치", "샐러드"] },
  { keyword: "족발", menus: ["족발"] },
  { keyword: "보쌈", menus: ["보쌈"] },
  { keyword: "삼겹살", menus: ["삼겹살"] },
  { keyword: "갈비", menus: ["갈비"] },
  { keyword: "불고기", menus: ["불고기"] },
  { keyword: "중화", menus: ["짜장면", "짬뽕"] },
  { keyword: "훠궈", menus: ["훠궈"] },
  { keyword: "딤섬", menus: ["딤섬"] },
  { keyword: "일본", menus: ["초밥", "우동"] },
  { keyword: "스시", menus: ["초밥"] },
  { keyword: "규카츠", menus: ["돈까스"] },
  { keyword: "베이커리", menus: ["샌드위치"] },
];

const fallbackCuisineRules: Array<{ keyword: string; menus: string[] }> = [
  { keyword: "burger", menus: ["햄버거"] },
  { keyword: "japanese", menus: ["초밥", "우동"] },
  { keyword: "korean", menus: ["국밥", "김치찌개"] },
  { keyword: "chinese", menus: ["짜장면", "짬뽕"] },
  { keyword: "western", menus: ["파스타", "피자"] },
  { keyword: "vietnamese", menus: ["쌀국수", "분짜"] },
  { keyword: "음식점", menus: ["백반"] },
];

function flattenRawText(raw: Json | null) {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  try {
    return JSON.stringify(raw);
  } catch {
    return "";
  }
}

function dedupeMenus(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const canonical = canonicalizeMenuLabel(value).trim();
    if (!canonical) continue;

    const key = normalizeText(canonical);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(canonical);
  }

  return output;
}

export function inferMenusFromRestaurant(
  name: string,
  category: string | null,
  raw?: Json | null,
  existingMenus: string[] = [],
): string[] {
  const baseText = `${name} ${category ?? ""} ${flattenRawText(raw ?? null)}`;
  const haystack = normalizeText(baseText);

  const fromAlias = menuAliasToCanonical
    .filter((item) => haystack.includes(normalizeText(item.alias)))
    .map((item) => item.canonical);

  const fromCategorySeed = categorySeedRules
    .filter((rule) => haystack.includes(normalizeText(rule.keyword)))
    .flatMap((rule) => rule.menus);

  const inferred = dedupeMenus([...existingMenus, ...fromAlias, ...fromCategorySeed]).slice(0, 8);
  if (inferred.length > 0) {
    return inferred;
  }

  const fallbackMenus = fallbackCuisineRules
    .filter((rule) => haystack.includes(normalizeText(rule.keyword)))
    .flatMap((rule) => rule.menus);

  return dedupeMenus([...fallbackMenus]).slice(0, 8);
}
