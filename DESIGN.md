# WeevCrafts Mail

This fork serves the WeevCrafts team in English. Each person has a private login;
an address shown in the mailbox switcher is not another person's account.
Keep the existing Vue, Element Plus and FlareMail interaction patterns.

## Canonical UI map

| Concern | Owner | WeevCrafts treatment |
| --- | --- | --- |
| Sign-in, setup, validation | views/login/index.vue | Preserve setup steps, password handling, error and pending states |
| Login presentation and preview | components/login-hero, login-card, login-card-head | Extend the shared components so preview and actual login agree |
| Brand name, logo and copy | worker/service/brand-service.js and web/utils/brand.js | WeevCrafts defaults; retain administrator overrides |
| Colour and contrast | web/utils/theme-accent.js | WeevCrafts forest green and warm paper palette; retain dark mode |
| Language | web/utils/locale.js | English default; preserve explicit account preferences |
| Permissions | worker/security and existing API checks | Member accounts cannot read another user's mail or administer users |

Use the marketplace's existing logo and craft photography with their original
files. Keep upstream license notices and accessible source attribution. Do not
copy the marketplace's framework into this independent application.

Check rendered desktop and 390px layouts, keyboard focus, readable error states,
theme switching and logo contrast. Keep form labels associated with controls.
Do not introduce motion required to understand or use the login form.
