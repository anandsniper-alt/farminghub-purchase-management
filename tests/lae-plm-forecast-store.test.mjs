import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {importPlmForecast,readPlmForecast} from '../server/lae-plm-forecast.mjs';

test('forecast catalog preserves every source row, access, history and revision on retry or conflict', () => {
  const db=new DatabaseSync(':memory:');
  const roles={admin:{role:'ADMIN'},buyer:{role:'EXECUTIVE',scopes:['LAE_IMPORT']},other:{role:'EXECUTIVE',scopes:['LAE_DOMESTIC']}};
  const store={db,userProfile:id=>roles[id]};
  const source={fileName:'Example.xlsx',sheet:'MASTER',sha256:'a'.repeat(64)};
  const item={code:'EX1',category:'Example',name:'Example model',skuStatus:'NO',engine:'',grade:'',sourceRow:5};
  const input={source,items:[item],expectedRevision:0};
  const key='import-example-1';
  try {
    assert.deepEqual(readPlmForecast(store,'buyer'),{revision:0,source:null,items:[]});
    assert.throws(()=>readPlmForecast(store,'other'),{code:'FORBIDDEN'});
    assert.throws(()=>importPlmForecast(store,'buyer',input,key),{code:'FORBIDDEN'});
    assert.equal(db.prepare('SELECT COUNT(*) n FROM sqlite_master').get().n,0);
    const result=importPlmForecast(store,'admin',input,key);
    assert.equal(result.count,1);
    assert.deepEqual(importPlmForecast(store,'admin',input,key),result);
    assert.deepEqual(readPlmForecast(store,'buyer'),{revision:1,source,items:[item]});
    const changed={...input,expectedRevision:1,items:[{...item,name:'Revised example'}]};
    assert.throws(()=>importPlmForecast(store,'admin',changed,key),{code:'CONFLICT'});
    assert.throws(()=>importPlmForecast(store,'admin',{...changed,expectedRevision:0},'import-example-2'),{code:'CONFLICT'});
    assert.throws(()=>importPlmForecast(store,'admin',{...changed,items:[item,{...item,sourceRow:9,code:'ex1'}]},'import-example-2'),/duplicate/);
    assert.equal(importPlmForecast(store,'admin',changed,'import-example-2').revision,2);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM lae_plm_forecasts').get().n,2);
    assert.deepEqual(readPlmForecast(store,'admin').items,changed.items);
  } finally {db.close();}
});
