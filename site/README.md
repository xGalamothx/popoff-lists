# PopOff documentation site

Static bilingual website for the PopOff project.

## Languages

- Spanish: root pages (index.html, docs.html, privacy.html, contribute.html).
- English: en/ directory.
- On a first visit, the site checks the browser's preferred languages and opens English when an English preference is present; otherwise it uses Spanish.
- The ES / EN link lets visitors switch manually. Their choice is saved locally in the browser and takes precedence on future visits.
- No analytics or third-party language service is used for language detection.

## Files

- index.html, docs.html, privacy.html, contribute.html: Spanish pages.
- en/: English equivalents.
- styles.css and script.js: shared presentation, navigation, and language selection.

## Publishing

Changes under site/** are deployed by .github/workflows/deploy-site.yml. For the first publication, enable GitHub Pages in Settings -> Pages and select GitHub Actions as the source.
