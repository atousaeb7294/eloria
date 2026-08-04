import { randomBytes } from "node:crypto";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const bytes = randomBytes(20);
let bits = "";
for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
let output = "";
for (let offset = 0; offset < bits.length; offset += 5) {
  output += alphabet[Number.parseInt(bits.slice(offset, offset + 5).padEnd(5, "0"), 2)];
}
console.log(output);
