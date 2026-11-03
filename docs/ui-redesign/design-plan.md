# ShareCreators UI redesign

Audience: game art leads, in-house artists and external production partners. The interface should make work easy to inspect and feedback easy to act on.

Palette: canvas #F4F5F9, paper #FFFFFF, ink #242539, studio navy #24243D, violet #6955D8, soft violet #EEEBFC. Amber and green remain semantic review/approval colors.
Typography: locally hosted Lato for Latin text and numbers; PingFang SC / Microsoft YaHei / system CJK fallback. 14px body, 12px metadata minimum where practical, 30px application titles, fluid 40–68px marketing titles.
Layout: left-aligned editorial introduction beside a composed art-review stage; dark navigation rail and light production workspace; larger imagery in the asset library; calm neutral surfaces in dense administration.

    brand                         navigation / sign in
    headline / explanation        art preview + version rail
    primary action                pinned review note
    sequential delivery workflow
    version / permissions / assistant

Review: an initial generic dashboard card grid was rejected for the marketing hero. Use the product's actual forest concept illustrations inside an explicit sample review, with asset thumbnails and a version marker. Do not invent customer statistics. Reserve dark fields for navigation and art inspection. Keep remaining surfaces quiet, differentiated by spacing instead of decorative gradients.

Validation: build, existing browser acceptance, desktop/mobile screenshots, responsive overflow, login, filtering, review comparison, administration modal and mobile menu.

## Completed

Implemented a split studio homepage with an illustrative review stage, dark application navigation, consolidated dashboard statistics, clearer asset cards, readable review panels, unified forms and administrative surfaces. Added locally served Lato font files with their license, visible focus states, reduced-motion support, mobile navigation dismissal and dialog labels.

The 360px login audit exposed grid min-content overflow; corrected the grid children and compacted the mobile art header. Screen audits cover nine routes at 360, 768 and 1440 pixels, plus mobile navigation. The published homepage and login were checked again at 360px without injected styles. Existing acceptance exercises real login, search, review comparison, version history and administration forms.

Final production build uses `.next-ui`; the former `.next` build is retained. The production service was restarted and `/api/health` returned `{"ok":true}`. Original UI source copies are stored under ignored `storage/ui-backups/`.
