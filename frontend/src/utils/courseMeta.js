const budgetFallbacks = ["3만원 이하", "3-5만원", "5만원+"];
const timeFallbacks = ["오전", "오후", "야간"];

const hashSeed = (input = "") => {
  if (!input) return 0;
  return input
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
};

export function getBudgetTag(course) {
  if (!course) return budgetFallbacks[1];
  if (course.budgetRange) return course.budgetRange;
  const seed =
    hashSeed(course._id || course.title || course.location) %
    budgetFallbacks.length;
  return budgetFallbacks[seed];
}

export function getTimeTag(course) {
  if (!course) return timeFallbacks[1];
  if (course.timeTag) return course.timeTag;
  const seed =
    hashSeed(course.location || course.title || course._id) %
    timeFallbacks.length;
  return timeFallbacks[seed];
}

export function getCityLabel(course) {
  if (!course || !course.location) {
    return "미정";
  }
  const [city] = course.location.split(" ");
  return city || course.location;
}


