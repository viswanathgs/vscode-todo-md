/**
 * @param a small number
 * @param b big number
 */
export function percentage(a: number, b: number): number {
	return a / b * 100;
}
/**
 * Replace numbers with emoji.
 */
export function fancyNumber(n: number): string {
	const digitMap = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
	return String(n)
		.split('')
		.map(digit => digitMap[Number(digit)])
		.join('');
}