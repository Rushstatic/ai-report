const now = new Date();
const toLocalYMD = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
console.log(toLocalYMD(firstDay));
console.log(toLocalYMD(lastDay));
