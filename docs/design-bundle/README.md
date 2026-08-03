# The design bundle, vendored

The interactive mocks and their runtime, as delivered on 3 August 2026. Open the
`.dc.html` files in a browser; `support.js` must sit beside them or nothing
renders.

**`support.js` is the mock runtime and is not part of the design.** The spec
says so directly: "not part of the bundle's design; do not port it." It is here
so the mocks can be read, not so anything can be copied out of it.

- `Behaviour Redesign.dc.html` — first pass. Thirteen turns, newest first.
  Anchors `#3a`, `#9c`, `#12b`, `#13a`.
- `Execution Audit.dc.html` — the audit of the implemented site: thirteen
  findings against 32 captures, with R9 set out in section 05.
- `Design Pass.dc.html` — second-pass screens. Home `#18a` `#18b` `#18c`, the
  R9 reference sheet `#17a`, contact `#16a` `#16b`, write-up `#15a` `#15b`. The
  lens filter, row disclosure and figure provenance all work in the browser.

The authority is `../DESIGN-SPEC-README.md`, not these files — and for the
second-pass screens specifically, only their **layout, hierarchy and behaviour**
is authoritative. Their palette drifted; the token tables in the README win.
