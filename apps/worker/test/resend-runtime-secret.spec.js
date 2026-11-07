import {describe,it,expect} from 'vitest';
import {resolveResendToken} from '../src/service/mail-provider-service';

describe('domain-scoped Resend Worker secret',()=>{
  it('uses the Worker secret only for its explicitly configured domain',()=>{
    const c={env:{RESEND_API_KEY:'re_isolated_fixture',RESEND_DOMAIN:'weevcrafts.com'}};
    expect(resolveResendToken(c,'weevcrafts.com',{})).toBe('re_isolated_fixture');
    expect(resolveResendToken(c,'other.test',{})).toBeUndefined();
    expect(resolveResendToken(c,'other.test',{'other.test':'re_other_fixture'})).toBe('re_other_fixture');
  });
  it('does not guess a domain or expose a Worker key through unrelated settings',()=>{
    expect(resolveResendToken({env:{RESEND_API_KEY:'re_isolated_fixture'}},'weevcrafts.com',{})).toBeUndefined();
    const tokens={'weevcrafts.com':'re_database_fixture'};
    expect(resolveResendToken({env:{}},'weevcrafts.com',tokens)).toBe('re_database_fixture');
    expect(tokens).toEqual({'weevcrafts.com':'re_database_fixture'});
  });
});
