import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'eloria-monitor-test-'));
try{
 const fixture=join(dir,'fetch-fixture.mjs'),alerts=join(dir,'alerts.jsonl');
 await writeFile(fixture,`import {appendFile} from 'node:fs/promises';globalThis.fetch=async(url,opts)=>{if(String(url).includes('/api/health'))return {ok:process.env.TEST_HEALTH==='up'};await appendFile(process.env.TEST_ALERT_FILE,opts.body+'\\n');return {ok:true};};`);
 function run(health){const result=spawnSync(process.execPath,['--import',pathToFileURL(fixture).href,'scripts/operations-agent.mjs','--once'],{env:{...process.env,NEXT_PUBLIC_SITE_URL:'https://example.test',ELORIA_OPERATIONS_STATE_DIR:dir,ELORIA_OPERATIONS_WEBHOOK:'https://alerts.example.test',ELORIA_BACKUP_ENABLED:'false',TEST_HEALTH:health,TEST_ALERT_FILE:alerts},encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 run('down');run('down');await assert.rejects(readFile(alerts));run('down');run('down');let messages=(await readFile(alerts,'utf8')).trim().split('\n');assert.equal(messages.length,1);run('up');messages=(await readFile(alerts,'utf8')).trim().split('\n');assert.equal(messages.length,2);assert.match(messages[1],/recovered/);run('up');assert.equal((await readFile(alerts,'utf8')).trim().split('\n').length,2);
 console.log('PASS: independent readiness monitor requires three failures, suppresses duplicate alerts and reports recovery; all HTTP mocked.');
}finally{await rm(dir,{recursive:true,force:true});}
