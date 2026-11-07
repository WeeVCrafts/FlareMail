import {env} from 'cloudflare:workers';
import {beforeAll,beforeEach,describe,it,expect} from 'vitest';
import {dbInit} from '../src/init/init';
import delivery from '../src/service/mail-delivery-service';

const secret='whsec_'+btoa('isolated-threading-signing-material');
const context=()=>({env:{...env,RESEND_WEBHOOK_SECRET:secret},get:()=>undefined,set:()=>{}});
async function receive(data,{valid=true,id=crypto.randomUUID()}={}) {
  const payload=JSON.stringify({type:'email.sent',created_at:new Date().toISOString(),data:{email_id:'thread-provider',to:['recipient@outside.test'],...data}});
  const timestamp=String(Math.floor(Date.now()/1000));
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(secret.slice(6)),c=>c.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id+'.'+timestamp+'.'+payload)))));
  const c=context();c.req={header:name=>({'svix-id':id,'svix-timestamp':timestamp,'svix-signature':'v1,'+(valid?signature:'invalid')}[name])};
  return delivery.receive(c,payload);
}
async function message(provider='thread-provider',status=1) {
  return env.db.prepare("INSERT INTO email(user_id,account_id,type,status,resend_email_id,delivery_provider,delivery_recipients,message_id) VALUES (1,1,1,?,?,'resend','[\"recipient@outside.test\"]','') RETURNING email_id AS id").bind(status,provider).first();
}
beforeAll(()=>dbInit.migrate(context()));
beforeEach(async()=>{
  for(const table of ['email','mail_delivery_event']) await env.db.prepare(`DELETE FROM ${table}`).run();
  // Each scenario has a distinct provider identifier, so retained early mappings cannot leak.
  await env.db.prepare("UPDATE mail_delivery_config SET secret='' WHERE id=1").run();
});
describe.sequential('signed Resend Message-ID reconciliation',()=>{
  it('uses an encrypted Worker secret without exposing it in public configuration',async()=>{
    expect((await delivery.getConfig({...context(),req:{url:'https://inbox.example.test/api/admin/mail-delivery'}})).secretConfigured).toBe(true);
    const mail=await message();
    await receive({message_id:'<actual-1@resend.test>'});
    expect((await env.db.prepare('SELECT message_id FROM email WHERE email_id=?').bind(mail.id).first()).message_id).toBe('<actual-1@resend.test>');
  });
  it('retains early signed events until the send response is persisted',async()=>{
    await receive({email_id:'early-provider',message_id:'<early@resend.test>'});
    const mail=await message('early-provider',6);
    await delivery.reconcile(context(),mail.id);
    expect((await env.db.prepare('SELECT message_id FROM email WHERE email_id=?').bind(mail.id).first()).message_id).toBe('');
    await env.db.prepare('UPDATE email SET status=1 WHERE email_id=?').bind(mail.id).run();
    await delivery.reconcile(context(),mail.id);
    expect((await env.db.prepare('SELECT message_id FROM email WHERE email_id=?').bind(mail.id).first()).message_id).toBe('<early@resend.test>');
  });
  it('rejects invalid signatures before storing any message identifier',async()=>{
    const mail=await message('invalid-provider');
    await expect(receive({email_id:'invalid-provider',message_id:'<forged@resend.test>'},{valid:false})).rejects.toMatchObject({code:403});
    expect((await env.db.prepare('SELECT message_id FROM email WHERE email_id=?').bind(mail.id).first()).message_id).toBe('');
  });
  it('ignores malformed RFC identifiers while accepting the signed delivery event',async()=>{
    const mail=await message('malformed-provider');
    await receive({email_id:'malformed-provider',message_id:'<ok@resend.test>\r\nBcc: victim@example.test'});
    expect((await env.db.prepare('SELECT message_id FROM email WHERE email_id=?').bind(mail.id).first()).message_id).toBe('');
  });
  it('never replaces an established identifier on a conflicting replay',async()=>{
    const mail=await message('stable-provider');
    await receive({email_id:'stable-provider',message_id:'<first@resend.test>'});
    await receive({email_id:'stable-provider',message_id:'<conflict@resend.test>'});
    expect((await env.db.prepare('SELECT message_id FROM email WHERE email_id=?').bind(mail.id).first()).message_id).toBe('<first@resend.test>');
  });
});
