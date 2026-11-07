// Downloads the Supermarker comparison page, parses it with the same
// parser the page uses (taken from index.html), and writes plans.json.
// Exits non-zero (and writes nothing) if the result looks wrong.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const URL = 'https://www.supermarker.themarker.com/bills/electricity';
const html = readFileSync('index.html', 'utf8');
const start = html.indexOf('function parsePlansDoc');
const end = html.indexOf('// CORE-END');
if (start < 0 || end < start) throw new Error('parser not found in index.html');
const { parsePlansDoc, cleanPlan } = new Function(html.slice(start, end) + '\nreturn { parsePlansDoc, cleanPlan };')();

const resp = await fetch(URL, { headers: { 'User-Agent': 'electricity-compare plan updater (+https://github.com/w567bgkmnw-stack/electricity-compare)', 'Accept-Language': 'he' } });
if (!resp.ok) throw new Error('HTTP ' + resp.status);
const text = await resp.text();
// JSDOM without runScripts: the page's scripts are never executed.
const doc = new JSDOM(text).window.document;
const res = parsePlansDoc(doc);
const plans = res.plans.map(cleanPlan).filter(Boolean);
if (plans.length < 8 || plans.length !== res.plans.length) throw new Error('unexpected parse result: ' + plans.length + '/' + res.plans.length + ' plans');

const prev = existsSync('plans.json') ? JSON.parse(readFileSync('plans.json', 'utf8')) : null;
const same = prev && JSON.stringify(prev.plans) === JSON.stringify(plans) && prev.checked === res.checked;
if (same) { console.log('No change (' + plans.length + ' plans).'); process.exit(0); }
const out = { source: URL, checked: res.checked, updated: new Date().toISOString().slice(0, 10), plans };
writeFileSync('plans.json', JSON.stringify(out, null, 1) + '\n');
console.log('Wrote ' + plans.length + ' plans (checked ' + res.checked + ').');
