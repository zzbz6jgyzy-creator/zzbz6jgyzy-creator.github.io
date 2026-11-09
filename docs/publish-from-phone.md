# Publish a story from your phone

One Markdown file is a whole story. You write it in GitHub's editor (the app or the website), commit it, and the site builds the page, the Dispatch card, the homepage entry, the share image, the sitemap and the feed within a few minutes. Nothing else to touch.

## 1. Start a new story (one tap)

**[Open a new story in GitHub's editor](https://github.com/zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io/new/main/content/dispatch?filename=write-the-slug-here.md&value=---%0Atitle%3A%20DRAFT%20Write%20the%20headline%20exactly%20as%20readers%20should%20see%20it%0Asummary%3A%20DRAFT%20One%20plain%20sentence%20that%20says%20what%20happened.%20It%20is%20also%20the%20standfirst%20and%20the%20search%20description.%0Atopic%3A%20spacex%0Atag%3A%20Starship%0A---%0A%0ADRAFT%20First%20paragraph%3A%20what%20happened%2C%20and%20who%20says%20so%2C%20with%20a%20link%20to%20the%20source%2C%20for%20example%20%5BSpaceX%5D%28https%3A%2F%2Fwww.spacex.com%2F%29.%0A%0ADRAFT%20Second%20paragraph%3A%20what%20is%20confirmed%2C%20and%20what%20is%20not%20yet.%0A%0ADRAFT%20Third%20paragraph%3A%20why%20it%20matters%2C%20in%20plain%20words.%0A%0A%23%23%20What%20we%20know%0A%0A-%20DRAFT%20One%20fact%20per%20line%2C%20each%20with%20its%20source.%0A%0A%3A%3Asources%20%5BSource%20name%5D%28https%3A%2F%2Fexample.com%2F%29%3B%20%5BAnother%20source%5D%28https%3A%2F%2Fexample.com%2F%29.%0A)**

Bookmark that link on your phone. It opens a new file in `content/dispatch/` with the template already filled in.

## 2. Fill it in

1. **File name** (top box): replace `write-the-slug-here` with the story's web address, lowercase with dashes, e.g. `starship-flight-15-catch`. It becomes `superchargeddaily.com/dispatch/starship-flight-15-catch.html`. Keep the `.md` ending.
2. **Every line that starts with DRAFT**: replace it with your text. The build refuses a story that still says DRAFT, so nothing half-written can go live.
3. **topic**: `tesla`, `spacex`, `xai` or `x`. **tag**: a short label such as `Robotaxi` or `Starship`.
4. **Sources**: link them in the sentence, like `[SpaceX](https://www.spacex.com/...)`, and list them on the `::sources` line. At least one link is required.
5. Optional photo: first upload it (step 3), then add two lines under `tag:`
   ```
   image: /assets/dispatch/your-photo.jpg
   imageAlt: What the photo shows
   ```

The full syntax (sections, tables, pull quotes, X posts, video) is in [writing-articles.md](writing-articles.md). Editorial rules: [.claude/rules/editorial.md](../.claude/rules/editorial.md).

## 3. Adding a photo (optional)

Open [assets/dispatch on GitHub](https://github.com/zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io/tree/main/assets/dispatch), tap **Add file → Upload files**, pick the photo, commit. Use a photo you have the right to publish (yours, an official press image, or a Wikimedia Commons photo with its licence) and credit it in the story. At least 1200 px wide helps Google Discover.

## 4. Publish

Tap **Commit changes**. You can commit straight to `main`; the story is live in a few minutes. If you would rather check it first, choose **Create a new branch** and open a pull request; the checks run on it and nothing goes live until you merge.

## 5. If something is wrong

- The build stops and the story does not go live. GitHub emails you and shows a red ✗ on the commit; tap it, open **Pre-render homepage**, and the error names the line, for example `line 4: remove DRAFT markers` or `no source links`.
- Fix the `.md` file in the same editor (open it, tap the pencil) and commit again.
- To change a published story, edit its `.md` file the same way. The page is rebuilt from it.
- The site integrity check also refuses any build that would cut a page off or empty the Dispatch list.
