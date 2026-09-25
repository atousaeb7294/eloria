import assert from 'node:assert/strict';
import { weightToGrams, gramsToSoot, readWeightGrams, savedWeightUnits, weightUnitsFromForm, formatStoredWeight } from '../src/lib/weight-units.ts';
assert.equal(weightToGrams('625', 'soot'), '0.625');
assert.equal(weightToGrams('۶۲۵', 'soot'), '0.625');
assert.equal(weightToGrams('٦٢٥', 'soot'), '0.625');
assert.equal(weightToGrams('۰٫۶۲۵'), '0.625');
assert.equal(weightToGrams('.625'), '0.625');
assert.equal(weightToGrams('1000', 'soot'), '1.000');
assert.equal(weightToGrams('1', 'soot'), '0.001');
assert.equal(weightToGrams('0.625000'), '0.625');
assert.equal(weightToGrams(''), null);
assert.equal(weightToGrams('0'), '0.000');
assert.equal(gramsToSoot('0.625'), '625');
for (let soot = 0; soot < 100000; soot += 137) {
  const grams = weightToGrams(String(soot), 'soot');
  assert.equal(gramsToSoot(grams), String(soot));
  assert.equal(weightToGrams(grams, 'gram'), grams);
}
for (const [raw, unit] of [['625', 'kg'], ['-1','soot'], ['1e3','soot'], ['NaN','gram'], ['0.0001','gram'], ['0.5','soot'], ['10000000','gram']]) {
  assert.throws(() => weightToGrams(raw, unit));
}
const form = new FormData();
form.set('metalWeight', '625'); form.set('metalWeightUnit', 'soot');
assert.equal(readWeightGrams(form, 'metalWeight'), '0.625');
form.set('goldComponentWeight', '1.250');form.set('goldComponentWeightUnit','gram');
form.set('silverComponentWeight','625');form.set('silverComponentWeightUnit','soot');
assert.equal(readWeightGrams(form,'goldComponentWeight'),'1.250');
assert.equal(readWeightGrams(form,'silverComponentWeight'),'0.625');
form.delete('metalWeightUnit');form.set('metalWeight','0.625');
assert.equal(readWeightGrams(form,'metalWeight'),'0.625','legacy forms still submit grams');
form.set('metalWeight','');assert.equal(readWeightGrams(form,'metalWeight'),null);
assert.equal(readWeightGrams(form,'metalWeight','1.000'),'1.000');
form.set('metalWeight',new Blob(['625']));assert.throws(()=>readWeightGrams(form,'metalWeight'));
console.log('PASS: 625 soot = 0.625 gram; Persian/Arabic digits; exact unit round trips; independent metal units; legacy grams; empty values; precision and invalid input rejection.');

const unitsForm = new FormData();
unitsForm.set('metalWeightUnit','soot');unitsForm.set('silverComponentWeightUnit','soot');
const persisted = JSON.parse(JSON.stringify({ eloriaWeightUnits: weightUnitsFromForm(unitsForm), unrelated: 'keep' }));
assert.equal(savedWeightUnits(persisted).metalWeight,'soot');
assert.equal(savedWeightUnits(persisted).goldComponentWeight,'gram');
assert.equal(savedWeightUnits(null).metalWeight,'gram');
assert.equal(formatStoredWeight('0.625','soot','en'),'625 soot');
assert.equal(formatStoredWeight('0.625','gram','en'),'0.625 g');
assert.ok(formatStoredWeight('0.625','soot','fa').includes('۶۲۵ سوت'));
console.log('PASS: saved unit metadata and exact customer-facing weight display.');
