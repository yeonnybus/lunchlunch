const anniversariesByDate: Record<string, string[]> = {
  "01-01": ["신정"],
  "02-14": ["발렌타인데이"],
  "03-03": ["삼겹살데이"],
  "04-14": ["블랙데이"],
  "05-08": ["어버이날"],
  "07-17": ["제헌절"],
  "08-15": ["광복절"],
  "10-03": ["개천절"],
  "10-09": ["한글날"],
  "11-11": ["빼빼로데이"],
  "12-25": ["크리스마스"],
};

export function getAnniversariesByDate(mmdd: string): string[] {
  return anniversariesByDate[mmdd] ?? [];
}
