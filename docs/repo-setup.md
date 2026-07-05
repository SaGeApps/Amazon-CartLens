# GitHub repo discoverability checklist

Do these once the repo is pushed to GitHub (Settings tab / repo homepage,
web UI only — not something git tracks).

## 1. Repo description (top of the repo page)

> Chrome extension that turns Amazon's cart price-change notices into a sortable price comparison table — see every price drop and increase at a glance.

## 2. Website field

Leave blank until the Chrome Web Store listing is live, then link it there —
it becomes a clickable link right under the description.

## 3. Topics (Settings → General, or the gear icon next to "About")

Add all of these — GitHub's topic pages are a real discovery surface, and
each one is a tag someone can browse to:

```
chrome-extension
browser-extension
amazon
price-tracker
price-comparison
price-drop
price-alert
manifest-v3
javascript
shopping
deal-finder
productivity
privacy-focused
open-source
```

## 4. Social preview image

Settings → General → Social preview. Upload a 1280×640px image (a screenshot
of the table works well) — this is what renders when the repo link is shared
on Twitter/X, Slack, Discord, LinkedIn, etc. Without it, shares show a blank
gray card, which kills click-through.

## 5. Pin it

If this is on your personal profile, pin the repo (profile page → Customize
your pins) so it's visible on your GitHub profile.

## 6. Cross-post once, after Chrome Web Store approval

Not part of the repo itself, but this is what actually moves the popularity
needle more than any metadata:

- r/chrome_extensions, r/amazon (check rules on self-promo first)
- Product Hunt
- A short post/thread on X or a dev newsletter, once there's a real install
  count or screenshot to show

## 7. Releases

Tag a `v1.0.0` release (`git tag v1.0.0 && git push --tags`) — the
`release.yml` workflow will build a zip automatically. Having tagged releases
with notes makes the repo look maintained, which matters for both human
trust and GitHub's own ranking signals.
