## Goal

Fill in missing levels in the `quiz` table for phases 11–20 as `four-pics` puzzles, generate 4 themed images per puzzle, upload them to the `fourpics-images` bucket, and write the rows with correctly formatted `answer`, `hint_letters`, `letters`, and `image_urls`.

## Missing Levels Found

| Phase | Phase Theme | Missing Levels |
|-------|-------------|----------------|
| 11 | Pentecost and the Holy Spirit | 5, 8 |
| 12 | The Early Church Community | 5, 8 |
| 13 | Peter's Ministry and Miracles | 5 |
| 14 | Conversion of Saul (Paul) | 8 |
| 15 | Paul's First Missionary Journey | 5, 8 |
| 16 | Paul's Second Missionary Journey | 5, 8 |
| 17 | The Jerusalem Council | 5, 8 |
| 18 | Paul's Third Missionary Journey | 5, 8 |
| 19 | Paul's Arrest and Imprisonment | 5, 8 (plus duplicate row cleanup — see note) |
| 20 | The Spread of the Gospel to Rome | 5, 8 |

Total: 18 new four-pics rows.

**Note on phase 19:** Every existing level (1, 2, 3, 4, 6, 7, 9, 10) has two identical duplicate rows. I will delete one row from each duplicate pair before inserting the new four-pics rows. If you'd rather I leave duplicates alone, say so.

## Proposed Words (4–10 letters, themed)

| Phase | Level | Word | Length |
|-------|-------|------|--------|
| 11 | 5 | TONGUES | 7 |
| 11 | 8 | PROPHECY | 8 |
| 12 | 5 | FELLOWSHIP | 10 |
| 12 | 8 | BREAD | 5 |
| 13 | 5 | HEALING | 7 |
| 14 | 8 | SCALES | 6 |
| 15 | 5 | JOURNEY | 7 |
| 15 | 8 | PREACH | 6 |
| 16 | 5 | MACEDONIA | 9 |
| 16 | 8 | PHILIPPI | 8 |
| 17 | 5 | COUNCIL | 7 |
| 17 | 8 | DECREE | 6 |
| 18 | 5 | EPHESUS | 7 |
| 18 | 8 | FAREWELL | 8 |
| 19 | 5 | CHAINS | 6 |
| 19 | 8 | PRISON | 6 |
| 20 | 5 | VOYAGE | 6 |
| 20 | 8 | SHIPWRECK | 9 |

If any word doesn't fit your vision, list replacements and I'll swap.

## Image Acquisition

I will **generate** 4 images per word using the image generator (clean, biblically themed illustrations) rather than scraping the web — generated images are royalty-free, consistent in style with your existing art, and avoid copyright risk. If you specifically want photographs scraped from the web, say so and I'll switch to web search + download. The 4 images per word will visually represent different angles of the concept (e.g., for CHAINS: iron chains, prisoner's wrists in chains, broken chains, a chained door).

## Storage Upload

For each puzzle, upload `phase{P}level{L}image{1..4}.jpg` to the public `fourpics-images` bucket via a Node script using the service role key.

## Quiz Row Format

Each row will follow the existing four-pics convention from `MainGameQuizManager.jsx`:
- `answer`: uppercase word
- `hint_letters`: last 2 letters of the word
- `letters`: shuffled answer + random A–Z padding to length 12
- `image_urls`: comma-separated 4 public URLs from the bucket
- `options`: null, `question`: null

## Execution Steps (after approval)

1. (Optional) Dedupe phase 19 existing rows.
2. For each of the 18 puzzles:
   - Generate 4 themed images → save locally → upload to `fourpics-images` bucket as `phase{P}level{L}image{1..4}.jpg`.
3. Insert 18 rows into `quiz` via a single SQL `INSERT` using the computed `letters`, `hint_letters`, and `image_urls`.
4. Verify with a SELECT that phases 11–20 each have levels 1–10.

## Confirmations Needed

1. OK to **generate** images (vs. web-scraped photos)?
2. OK to **delete duplicate rows** in phase 19?
3. Approve the proposed word list (or send replacements)?