// Kirish huquqi — React'siz, sof mantiq.
//
// Qoida: birinchi to'rt mavzu hammaga ochiq, qolgani hisob talab qiladi.
// Nega birinchilari: odam nima olayotganini ko'rmasdan ro'yxatdan o'tmaydi.

export const FREE_TOPIC_COUNT = 4;

export type TopicLike = { id: string };
export type StageLike = { topics: TopicLike[] };

/**
 * Ochiq mavzular — xaritadagi tabiiy tartib bo'yicha birinchi to'rttasi.
 * Bosqichlar ichidagi tartib `content/roadmap.json` bilan bir xil.
 */
export function freeTopicIds(stages: StageLike[]): string[] {
  const ids: string[] = [];
  for (const stage of stages) {
    for (const topic of stage.topics) {
      if (ids.length === FREE_TOPIC_COUNT) return ids;
      ids.push(topic.id);
    }
  }
  return ids;
}

export function isFreeTopic(stages: StageLike[], topicId: string): boolean {
  return freeTopicIds(stages).includes(topicId);
}

/**
 * Mavzu qulflanganmi. Kirgan foydalanuvchi uchun hech narsa qulflanmaydi.
 */
export function isLocked(
  stages: StageLike[],
  topicId: string,
  signedIn: boolean,
): boolean {
  if (signedIn) return false;
  return !isFreeTopic(stages, topicId);
}
