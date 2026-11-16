# 09. Saved items spec

Written by Fable on 15 Nov 2026. This is a spec only. Nothing here has been built or tested.
It covers section 8 of `00-master-plan.md` and is the file for **Build 4**. Plan limits come from `07-accounts-and-billing.md`.

**Builder rules.** I read the app's code for saved items before writing this, so the names below are the real ones. I could not run anything. Use the wording, field names and rules exactly. If something here does not match the code you find, stop and ask. Change as little of the existing code as you can.

---

## 1. What exists today

- The app already keeps a list called `S.catalog`, one per business. It is stored on the phone as `aurum.catalog` and travels in the backup inside each business's bundle.
- Each entry is `{ desc, price, note, img, uses }`. There is no id. Entries are matched by name (`desc`, lower-cased).
- It fills itself: when a document is sent, every item with a name and a price above zero is added, or, if the name is already there, its price, detail and photo are **overwritten** with the latest ones and `uses` goes up by one.
- It is used in two places in the Items step: the four quick chips under the items (most used first), and the "Your items" list that appears as you type a name. Trade suggestions from `INDUSTRIES` appear under it.
- A photo on an item is shrunk to 220px with `readImage(f, 220, "image/jpeg", .82)` and kept as text inside the item.
- When two devices back up, `mergeBundle` joins the two lists by name and keeps the entry with the higher `uses`.
- **There is no screen to see, edit or remove a saved item.** A wrong name or price stays until it is overwritten, and nothing can be deleted, because the merge brings it back.

Build 4 gives the list a screen, makes it safe to edit and delete across devices, and prepares it for the storefront. The Items step keeps working the way people already know.

---

## 2. What a saved item holds

The list keeps its name, `S.catalog`, and its place in storage and in the backup. Each entry gains fields. `desc` keeps its name in the code, because many lines use it.

| Field | Meaning | Rules |
|---|---|---|
| `id` | A fixed id for the item | See part 7 for how old items get one |
| `desc` | The name | Required. Up to 80 characters. No two live items may share a name (ignoring capitals). |
| `price` | The usual price | Same form as today. May be empty, meaning "price on request". |
| `unit` | How it is sold | Optional. Up to 16 characters. For example `each`, `per yard`. |
| `note` | A short detail | Optional. Up to 120 characters. This is the existing "Detail" line. |
| `img` | A small photo | Optional. Stored at 160px, JPEG, quality .75 (part 8). |
| `category` | The owner's own grouping | Optional. Up to 24 characters. |
| `lock` | "Keep this price fixed" | `true` or `false`. Default `false`. |
| `uses` | Times sent | As today. |
| `lastUsed` | When it was last sent | A timestamp. |
| `updatedAt` | When the owner last changed it | A timestamp. Not changed by `uses` or `lastUsed`. |
| `archived` | Hidden from the pickers, kept in the list | `true` or `false`. |
| `deleted` | Removed | `true` on a removed item. Only `id`, `desc`, `deleted` and `updatedAt` are kept (part 7). |
| `inStore` | Show in the public store | `false`. **No screen uses it in this build.** Kept for the storefront. |
| `storeNote` | A line for the store, such as "Made to order, 5 days" | Empty. **No screen uses it in this build.** |

Categories are simply the set of `category` values in use. There is no separate list to manage. At most 12 different categories per business.

---

## 3. The Saved items screen

### 3.1 Where it lives
- In the dashboard (`renderDash`), a new section **after Clients** (`#dash-clients`), built from the same parts as the Clients section: the same row style, the same search field, the same way of opening a detail sheet (`openClient` is the model).
  - Section heading: `Saved items`
  - It shows the five most-used items and a link `See all {n} items`, which opens the full screen.
- In "My house", a new row under **Documents**: `Saved items`, with the count on the right. It opens the full screen.
- In the Items step, a link under the quick chips: `Browse saved items` (part 4.3).

### 3.2 The full screen
- Title: `Saved items`
- Under the title: `{n} items`. When the plan has a limit: `{n} of {limit} items`.
- Search field, placeholder `Search items`. It searches the name, the detail and the category.
- A row of chips: `All`, then each category in A to Z order, then `Archived` (shown only when something is archived).
- A two-way switch: `Most used` (default) · `A to Z`.
- A button: `Add item`.
- Rows, 50 at a time, with `Show more` at the bottom. Each row: the photo (or a tile with the first letter of the name), the name, the price with the unit (`₦4,500 per yard`, or `Price on request`), and a small second line `Used {n} times` (nothing when 0). A small padlock when the price is fixed.
- Tapping a row opens the item sheet.

**When the list is empty:**
- Text: `Your saved items will appear here. Aurum saves each item the first time you send it. You can also add your price list now.`
- Buttons: `Add item` · `Start with suggestions`
- `Start with suggestions` shows the trade's list from `INDUSTRIES` (the trade chosen at set-up) as tick boxes, each with an empty price field. Heading: `Suggestions for {trade name}`. Line: `Tick the ones you sell and add your prices. You can leave a price empty.` Button: `Add {n} items`. If the trade is "Something else", this button is not shown.

### 3.3 The item sheet (add and edit)
| Field | Detail |
|---|---|
| `Name` | Placeholder `For example: Bridal makeup` |
| `Price` | Naira, with commas as you type, the same as the price field in the Items step. Hint under it: `Leave empty if the price changes each time.` |
| `Sold` (the unit) | Chips: `each`, `per pack`, `per yard`, `per hour`, `per day`, `per guest`, `Other`. `Other` opens a short text field. No chip selected means no unit. |
| `Category` | Chips of the categories already in use, and `New category`, which opens a short text field. |
| `Detail` | Placeholder `Size, colour, what is included…` |
| `Photo` | `Add a photo`; when there is one: the photo, `Change` and `Remove`. |
| `Keep this price fixed` (a switch) | Hint: `When this is off, Aurum remembers the last price you charged. When it is on, the saved price only changes when you change it here.` |

- Buttons on a new item: `Save` · `Cancel`.
- Buttons on an existing item: `Save`, and below it `Add to a new invoice` · `Archive` (or `Bring back` when archived) · `Delete`.
- `Add to a new invoice` starts a new invoice with this one item already in it, on the Client step.

**Messages (exact):**
| When | Message |
|---|---|
| Name empty | `Give the item a name.` |
| Name already used | `You already have an item called "{name}".` with a link `Open it` |
| Saved | toast `Saved` |
| Archived | toast `Archived. You can find it under Archived.` with `Undo` |
| Brought back | toast `Back in your saved items` |
| Delete (asks first) | `Delete "{name}"? Documents you already sent are not affected.` Buttons `Delete` · `Keep` |
| More than 12 categories | `You can have up to 12 categories. Use one you already have.` |
| Storage is full (part 8) | `This phone has no more room for Aurum's saved items. Your last change was not saved. Remove a photo or an item you no longer need.` |

---

## 4. Using saved items while making a document

### 4.1 What stays the same
- The four quick chips, most used first.
- The "Your items" list and the trade "Suggestions" as you type.
- Picking an item fills in the name, the price, the detail and the photo, and puts the cursor in the price field when the price is empty.

### 4.2 Small changes
1. Archived and deleted items never appear in the chips, the typing list or the browse sheet.
2. In the typing list and on the chips the price shows its unit: `₦4,500 per yard`.
3. When an item with a unit is picked and its detail is empty, the unit goes into the document item's detail line with a capital letter (`Per yard`). The document's layout does not change.
4. The document item also records `catId`, the saved item's `id`. It is for counting and for the storefront later. **It is never used to look up a price or a name.**

### 4.3 The browse sheet (new)
`Browse saved items`, under the quick chips, opens a sheet: the search field, the category chips, and the items as rows with a tick box. Tapping a row ticks it. A ticked row shows `−  1  +` to set the quantity. The button at the bottom reads `Add {n} items`. Each is added to the document as if picked one by one. Empty item rows already on the document are filled first, as the quick chips do today.

### 4.4 How prices are remembered (the one rule that changes)
Today, sending a document overwrites the saved price with whatever was charged. That stays the default, because prices move often and people expect Aurum to remember the last one. One thing is added: a saved item can be marked **"Keep this price fixed"**.

When a document is sent, for each item with a name and a price above zero:
| The item | What happens to the saved item |
|---|---|
| Is not in the saved items yet | It is added (name, price, detail, photo), unless the plan's limit is reached (part 6). `uses` is 1. |
| Is saved, price **not** fixed | As today: the price, the detail and the photo are updated to the ones just used, and `updatedAt` is set. `uses` goes up by one. |
| Is saved, price **fixed** | Only `uses` and `lastUsed` change. The saved price, detail and photo stay. |
| Is saved but archived | It comes back out of the archive, then follows the rows above. If the plan's limit is reached it stays archived, and only `uses` and `lastUsed` change. |

Matching is by `catId` first, then by name.

In the Items step, under the price field of an item that came from a **fixed-price** saved item and now has a different price, show one quiet line: `Your saved price is {₦45,000}.` with a link `Update saved price`. Tapping it changes the saved price and shows the toast `Saved price updated`. Nothing is shown for items whose price is not fixed.

### 4.5 Old documents never change
A document holds its own copy of each item's name, price, detail and photo, taken at the moment the item was added. Editing, renaming, archiving or deleting a saved item changes **no** document: not a draft, not a sent document, not a client link, not a PDF. This is how the app already works. Build 4 must not add any code that reads a saved item when showing a document.

---

## 5. Two businesses
Pro and Prestige accounts can have two businesses. Each keeps its own saved items, as today. Switching business switches the list. Nothing is shared between them in this build.

---

## 6. Plan limits

The limit is `ent.catalogue_max` from file 07: Free 10, Starter and Signature 100, Pro and Prestige 500.

- What counts: live items (not archived, not deleted), per business.
- **Nothing is ever taken away.** A person who already has more remembered items than their plan's limit keeps all of them, and they all keep working. The limit only stops new ones.
- At the limit, `Add item`, `Bring back` and `Start with suggestions` show the sheet: heading `You have reached {10} saved items`, text `Your items all stay. To add more, move to {Starter}, which keeps {100}.`, buttons `See plans` · `Not now`. On Starter it names Pro and 500. On Pro and Prestige: heading `You have reached 500 saved items`, text `Archive items you no longer sell to make room.`, button `Close`.
- At the limit, sending a document with a new item simply does not save that item. **No message interrupts the sending.** The screen's count line then reads `{10} of {10} items · new items are not being saved`.
- The limit is checked by the app only. There is nothing here worth guarding on the server.

**A change to file 07:** it gave Pro and Prestige "Unlimited" saved items. That was not honest. The list and its photos live in the phone's own storage, which is small, and 500 with photos is close to what it holds safely (part 8). File 07 and the Pricing table now say **500**.

---

## 7. Backup and merging across devices

### 7.1 Ids for the items people already have
An old entry has no id. Two phones must give the same old item the same id without talking to each other. So:
- An entry with no `id` gets `id = "c" + hashStr(desc.toLowerCase())`, using the existing `hashStr`, and `updatedAt = 1`.
- New items made after this build get `id = uid()` and `updatedAt = Date.now()`.
- This runs in one small function, `tidyCatalog(list)`, called when the app loads, after every merge, and before every save. It also fills in the other new fields with their defaults, shrinks any photo larger than 160px (part 8), and drops removed items older than 90 days.

The user does nothing and sees nothing. Their remembered items simply appear in the new screen.

### 7.2 The merge rule (replaces the catalogue line in `mergeBundle`)
1. Join the two lists by `id`.
2. Where both sides have the same `id`: take every field from the side with the larger `updatedAt` (a missing `updatedAt` counts as 0). Then set `uses` to the larger of the two and `lastUsed` to the later of the two.
3. Then look for two **live** entries with the same name and different ids (the same item added on two phones while apart). Keep the one with the larger `updatedAt`, give it the larger `uses`, and drop the other.
4. Run `tidyCatalog`.

Only the catalogue line of `mergeBundle` changes. History, clients and profile merge as they do today.

### 7.3 Deleting
A deleted item is not removed from the list straight away, or the next backup from another phone would bring it back. It is replaced by a small marker: `{ id, desc, deleted: true, updatedAt }`. The marker wins any merge against an older copy, and is dropped after 90 days. Adding an item with the same name later makes a new item with a new id.

### 7.4 A phone that has not updated yet
For a short while one phone may run the old version. It will keep merging by name and may send back entries without the new fields. That is safe: an entry with no `updatedAt` loses to any edited one, and `tidyCatalog` gives it the same id as before. No extra code is needed.

---

## 8. Photos and the phone's storage

The saved items and their photos live in the browser's storage on the phone (`localStorage`), which holds only a few megabytes for everything Aurum keeps. Today `LS.set` hides a failed save: if storage is full, the change is silently lost. A bigger catalogue makes that more likely, so:

1. **Smaller photos in the catalogue.** A saved item's photo is stored at 160px, JPEG, quality .75. A photo added to a document item keeps today's 220px; when that item is saved to the catalogue, the photo is shrunk to 160px first.
2. **A checked save for the catalogue.** Saving `aurum.catalog` must not hide a failure. If the save fails, undo the change in memory and show the "no more room" message from part 3.3.
3. **A ceiling on photo space.** If the catalogue's text (`JSON.stringify(S.catalog)`) is longer than 2,000,000 characters, a new photo is refused with: `Your saved items have used their photo space on this phone. Remove a photo you no longer need.` The item itself can still be saved without a photo.
4. **The backup.** The server refuses a backup above 8 MB and answers `too_large`. The app does not handle that answer today. Add: when the backup answers `too_large`, the status in the top bar reads `Backup is full` and tapping it shows `Your backup has reached its size limit. Remove photos from saved items you no longer need, then try again.`

Honest limit: this keeps the present design safe up to about 500 items. A shop with thousands of products needs the items kept on the server instead. That change belongs with the storefront (part 10), not here.

---

## 9. What you test (Zip 4)

1. Open the app after the update: every item you had remembered is in `Saved items`, with nothing asked of you.
2. Add an item with a photo, a unit and a category. Edit it. Archive it, bring it back, then delete it.
3. Make an invoice: the quick chips and the typing list still work, and the price shows the unit.
4. `Browse saved items`: tick three, change a quantity, add them.
5. Send an invoice with a saved item at a new price. With "Keep this price fixed" off, the saved price changes. With it on, the saved price stays and the `Update saved price` link appears next time.
6. Change a saved item's name and price. Open an invoice you sent last week: **it has not changed**, as a link and as a PDF.
7. On a second phone signed in to the same account: the items appear. Delete one on the first phone; after both have backed up, it is gone from the second and does not come back.
8. On a Free account with 10 items: `Add item` shows the calm limit message; sending an invoice with a new item is not interrupted.
9. On a Pro account with two businesses: each business has its own list.
10. In aeroplane mode: the screen opens and you can add and edit items; they back up when you reconnect.
11. On the Infinix Note 30: the list scrolls smoothly with 100 items.

---

## 10. For the storefront later (notes for file 10)
- `inStore` and `storeNote` are already on every item and already travel in the backup, so turning the storefront on does not need a change to the list.
- The storefront cannot read saved items from a phone. When it is built, items marked `inStore` must be copied to a table on the server, with larger photos kept in Supabase Storage rather than as text. File 10 decides how.
- `catId` on document items lets the storefront and reports count what was sold.
- A fixed price (`lock`) should be required before an item can be shown in the store, so that a one-off price given to one client never changes the public price.

---

## 11. One small extra for this build
The SEO plan relies on Nigerian names for two documents. Checking the code: a delivery note can already be titled `Waybill`, but a purchase order cannot be titled `LPO`. In `TITLES`, change `purchase` from `["Purchase Order", "Order Form"]` to `["Purchase Order", "LPO", "Local Purchase Order", "Order Form"]`. Nothing else changes.

---

## 12. Decisions I need from you
1. **How prices are remembered.** Aurum keeps remembering the last price you charged, as it does today, unless you switch on "Keep this price fixed" for an item. Yes, or should saved prices always stay fixed until you change them?
2. **500 saved items on Pro, not "Unlimited".** This is the honest number for a list kept on the phone. Yes?
3. **People over their plan's limit keep all their items.** The limit only stops new ones. Yes?

## 13. Not in this build
- Stock counts and "sold out". Aurum is not a stock-keeping app.
- Pasting or importing a whole price list from a file.
- Copying items from one business to the other.
- Different prices for different clients.
- Showing items in a public store (file 10).
