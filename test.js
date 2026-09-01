const toLocalYMD = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const now = new Date(); // Sept 1st 2026 is a Tuesday.
console.log('Today:', now.toString());
const day = now.getDay() || 7; 
const firstDay = new Date(now);
firstDay.setDate(now.getDate() - day + 1);
const lastDay = new Date(firstDay);
lastDay.setDate(firstDay.getDate() + 6);
console.log('Weekly:', toLocalYMD(firstDay), 'to', toLocalYMD(lastDay));

// Fortnightly
const year = now.getFullYear();
const month = now.getMonth();
const date = now.getDate();
let fStart, fEnd;
if (date <= 15) {
  fStart = new Date(year, month, 1);
  fEnd = new Date(year, month, 15);
} else {
  fStart = new Date(year, month, 16);
  fEnd = new Date(year, month + 1, 0);
}
console.log('Fortnightly:', toLocalYMD(fStart), 'to', toLocalYMD(fEnd));

// Monthly
const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
console.log('Monthly:', toLocalYMD(mStart), 'to', toLocalYMD(mEnd));
