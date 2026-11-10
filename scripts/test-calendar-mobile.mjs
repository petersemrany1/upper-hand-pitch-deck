// Browser regression suite against the example-data approval route. No live writes.
// Start `bun run dev --host 127.0.0.1 --port 5173`, then run with Playwright installed.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/test-calendar-mobile.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.CALENDAR_TEST_URL || 'http://127.0.0.1:5173/calendar-preview';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Only run this fixture suite on localhost');
const out = 'tmp/calendar-mobile-qa';
await mkdir(out, { recursive: true });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const datePlus = (date, days) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('clinic-calendar-approval:v2:')))));
const dialog = page => page.getByRole('dialog');
const saved = page => dialog(page).waitFor({ state: 'hidden' });
const choose = (page, date) => page.getByLabel('Go to date', { exact: true }).fill(date);
const tap = async locator => { await locator.scrollIntoViewIfNeeded(); await locator.tap(); };
const layout = async page => {
  const result = await page.evaluate(() => ({
    pageFits: document.documentElement.scrollWidth <= window.innerWidth + 1,
    dialogFits: [...document.querySelectorAll('.availability-dialog')].every(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().bottom <= visualViewport.offsetTop + visualViewport.height + 1),
    smallTargets: [...document.querySelectorAll('.availability-calendar button, .availability-dialog button')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && (r.width < 43.5 || r.height < 43.5); }).map(el => el.textContent),
    smallInputs: [...document.querySelectorAll('.availability-dialog input:not([type=checkbox]), .availability-dialog select')].filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).length,
  }));
  check(result.pageFits && result.dialogFits, `No horizontal overflow or off-screen dialog: ${JSON.stringify(result)}`);
  check(!result.smallTargets.length && !result.smallInputs, `Touch targets and text: ${JSON.stringify(result)}`);
};

for (const engine of (process.env.CALENDAR_TEST_ENGINES || 'chromium,webkit').split(',')) {
  const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' }));
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('.availability-mobile').waitFor();
    const original = await state(page), monday = original.blocks[0].slot_date;
    const peer = await context.newPage();
    await peer.goto(url);
    await peer.locator('.availability-mobile').waitFor();
    check(await page.getByText('Sales portal · Booking', { exact: true }).count() === 0, 'Clinic preview has no sales-booking tab');

    await tap(page.getByRole('button', { name: 'Upcoming appointments', exact: true }));
    check(await page.locator('.availability-upcoming-card').count() === original.appointments.length, 'Upcoming list includes all future dates');
    await page.getByLabel('Search upcoming patients').fill('not-a-patient');
    check(await page.locator('.availability-upcoming-card').count() === 0, 'Upcoming search filters patients');
    await tap(page.getByRole('button', { name: 'Clear search', exact: true }));
    await tap(page.locator('.availability-upcoming-card .availability-mobile-entry').first());
    check((await dialog(page).innerText()).includes(original.appointments[0].patient_name), 'Upcoming patient details open');
    await tap(dialog(page).getByRole('button', { name: 'Close', exact: true }));
    await tap(page.locator('.availability-upcoming-view-day').first());
    check(await page.getByLabel('Go to date', { exact: true }).inputValue() === original.appointments[0].appointment_date, 'Upcoming entry opens its calendar day');
    await choose(page, monday);

    for (const [width, height] of [[320, 568], [360, 740], [375, 667], [390, 844], [430, 932], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.locator('.availability-mobile').waitFor();
      await layout(page);
      await tap(page.locator('.availability-settings-summary'));
      await layout(page);
      check(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'dialog'), 'Editor opens without forcing keyboard focus');
      await page.screenshot({ path: `${out}/${engine}-${width}-settings.png` });
      await tap(dialog(page).getByRole('button', { name: 'Cancel', exact: true }));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    if (engine === 'chromium') {
      await page.locator('.availability-mobile-entry-blocked').scrollIntoViewIfNeeded();
      const card = await page.locator('.availability-mobile-entry-blocked').boundingBox();
      const beforeScroll = await page.evaluate(() => window.scrollY);
      const version = (await state(page)).version;
      const cdp = await context.newCDPSession(page);
      const x = card.x + card.width / 2, y = card.y + card.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + i * 20 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      check((await state(page)).version === version && await dialog(page).count() === 0, 'Swiping a block never changes it or opens the editor');
      check(await page.evaluate(() => window.scrollY) < beforeScroll, 'The page scrolls when swiping a blocked card');
      await cdp.detach();
    }
    await choose(page, monday);
    await tap(page.locator('.availability-mobile-block'));
    await dialog(page).getByLabel('From', { exact: true }).fill('12:30');
    await dialog(page).getByLabel('Until', { exact: true }).fill('13:00');
    await tap(dialog(page).getByRole('button', { name: 'Block time', exact: true }));
    await saved(page);
    check((await state(page)).blocks.some(block => block.slot_start === '12:30' && block.slot_end === '13:00'), 'Block saved');
    await peer.locator('.availability-mobile-entry-blocked').filter({ hasText: '12:30pm' }).waitFor();
    checks++;

    // Move and resize through precise phone controls, then undo the atomic change.
    await tap(page.locator('.availability-mobile-entry-blocked').filter({ hasText: '12:30pm' }));
    await dialog(page).getByLabel('Date', { exact: true }).fill(datePlus(monday, 3));
    await dialog(page).getByLabel('From', { exact: true }).fill('13:00');
    await dialog(page).getByLabel('Until', { exact: true }).fill('13:45');
    await tap(dialog(page).getByRole('button', { name: 'Save changes', exact: true }));
    await saved(page);
    check(await page.getByLabel('Go to date', { exact: true }).inputValue() === datePlus(monday, 3), 'Move follows the destination date');
    check((await state(page)).blocks.some(block => block.slot_date === datePlus(monday, 3) && block.slot_end === '13:45'), 'Move and resize persisted');
    await tap(page.getByRole('button', { name: 'Undo last change' }));
    await choose(page, monday);
    await page.locator('.availability-mobile-entry-blocked').filter({ hasText: '12:30pm' }).waitFor();
    await tap(page.locator('.availability-mobile-entry-blocked').filter({ hasText: '12:30pm' }));
    await tap(dialog(page).getByRole('button', { name: 'Unblock this time', exact: true }));
    await saved(page);
    check((await state(page)).blocks.length === 1, 'Unblock releases the range');

    // Closing and reopening a date, without touching weekly defaults.
    await tap(page.locator('.availability-mobile-hours'));
    await dialog(page).getByLabel('Block the whole day').check();
    await tap(dialog(page).getByRole('button', { name: 'Save working hours' }));
    await saved(page);
    check((await page.locator('.availability-mobile-hours').innerText()).includes('Closed'), 'Full-day closure');
    await tap(page.locator('.availability-mobile-hours'));
    await dialog(page).getByLabel('Finish work', { exact: true }).fill('16:00');
    await tap(dialog(page).getByRole('button', { name: 'Save working hours' }));
    await saved(page);
    check((await page.locator('.availability-mobile-hours').innerText()).includes('4pm'), 'Make date available again');
    check(JSON.stringify((await state(page)).trading) === JSON.stringify(original.trading), 'Date hours preserve weekly rules');

    // Booked patients remain protected before a save request is made.
    await choose(page, datePlus(monday, 1));
    await tap(page.locator('.availability-mobile-block'));
    await dialog(page).getByLabel('From', { exact: true }).fill('09:00');
    await dialog(page).getByLabel('Until', { exact: true }).fill('09:30');
    check(await dialog(page).getByRole('button', { name: 'Block time', exact: true }).isDisabled(), 'Cannot block a patient');
    check((await dialog(page).getByRole('alert').innerText()).includes('patient'), 'Patient conflict explained');
    await tap(dialog(page).getByRole('button', { name: 'Cancel', exact: true }));
    await tap(page.locator('.availability-mobile-hours'));
    await dialog(page).getByLabel('Block the whole day').check();
    check(await dialog(page).getByRole('button', { name: 'Save working hours' }).isDisabled(), 'Cannot close a day with a patient');
    await tap(dialog(page).getByRole('button', { name: 'Cancel', exact: true }));

    // Buffer and consultation settings, including existing-patient confirmation.
    await tap(page.locator('.availability-mobile-entry-buffer'));
    await tap(dialog(page).getByRole('button', { name: 'Change buffer length' }));
    await dialog(page).getByLabel('Buffer between patients in minutes').fill('15');
    await tap(dialog(page).getByRole('button', { name: 'Save settings', exact: true }));
    await saved(page);
    check((await state(page)).buffer_minutes === 15, 'Buffer saved');
    await tap(page.locator('.availability-settings-summary'));
    await dialog(page).getByLabel('Consultation length in minutes').fill('60');
    await tap(dialog(page).getByRole('button', { name: 'Save settings', exact: true }));
    check((await state(page)).consultation_minutes === 90, 'Duration unchanged before confirmation');
    await tap(dialog(page).getByRole('button', { name: 'Yes, update all appointments' }));
    await saved(page);
    const resized = await state(page);
    check(resized.consultation_minutes === 60 && resized.appointments.every(a => a.consultation_duration_minutes === 60), 'Confirmed consultation lengths saved');
    check(resized.appointments.every((a, i) => a.appointment_time === original.appointments[i].appointment_time), 'Appointment starts preserved');

    // Weekly hours are fully editable on the smallest supported width.
    await page.setViewportSize({ width: 320, height: 568 });
    await tap(page.locator('.availability-settings-summary'));
    await dialog(page).getByLabel('Friday until', { exact: true }).fill('16:00');
    await tap(dialog(page).getByRole('button', { name: 'Save settings', exact: true }));
    await tap(dialog(page).getByRole('button', { name: 'Yes, update all appointments' }));
    await saved(page);
    check((await state(page)).trading[4].close_time === '16:00', 'Weekly hours saved on 320px phone');

    // Copy/repeat date hours still respects explicit closed dates.
    await choose(page, datePlus(monday, 3));
    await tap(page.locator('.availability-mobile-hours'));
    await dialog(page).getByLabel('Start work', { exact: true }).fill('08:00');
    await dialog(page).getByLabel('Finish work', { exact: true }).fill('16:00');
    await tap(dialog(page).locator('summary'));
    await tap(dialog(page).getByRole('button', { name: 'Fri', exact: true }));
    await dialog(page).getByLabel('Repeat every week').check();
    await dialog(page).getByLabel('Repeat until', { exact: true }).fill(datePlus(monday, 11));
    await tap(dialog(page).getByRole('button', { name: 'Save working hours' }));
    await saved(page);
    const copied = await state(page);
    check(copied.overrides.some(o => o.override_date === datePlus(monday, 4) && o.start_time === '08:00'), 'Hours copied to Friday');
    check(copied.overrides.some(o => o.override_date === datePlus(monday, 10) && o.start_time === '08:00'), 'Hours repeated next week');
    check(copied.overrides.some(o => o.override_date === datePlus(monday, 11) && o.override_type === 'closed'), 'Repeating hours preserves existing closures');

    // Repeat blocks and midnight endpoints stay available through normal controls.
    await choose(page, datePlus(monday, 3));
    await tap(page.locator('.availability-mobile-block'));
    await dialog(page).getByLabel('From', { exact: true }).fill('14:00');
    await tap(dialog(page).getByRole('button', { name: 'Rest of day' }));
    await tap(dialog(page).locator('summary'));
    await dialog(page).getByLabel('Repeat every week').check();
    await dialog(page).getByLabel('Repeat until', { exact: true }).fill(datePlus(monday, 10));
    await tap(dialog(page).getByRole('button', { name: 'Block time', exact: true }));
    await saved(page);
    check((await state(page)).blocks.filter(block => block.slot_start === '14:00' && block.slot_end === '24:00').length === 2, 'Repeated end-of-day blocks saved');

    // A persistence failure retains the draft. Retrying succeeds without duplicate blocks.
    await page.evaluate(() => { window.calendarOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.startsWith('clinic-calendar-approval:')) throw new DOMException('Storage full', 'QuotaExceededError'); return window.calendarOriginalSetItem.call(this, key, value); }; });
    await tap(page.locator('.availability-mobile-block'));
    await dialog(page).getByLabel('From', { exact: true }).fill('12:00');
    await dialog(page).getByLabel('Until', { exact: true }).fill('12:30');
    const beforeFailure = await state(page);
    await tap(dialog(page).getByRole('button', { name: 'Block time', exact: true }));
    await dialog(page).getByRole('alert').waitFor();
    check(await dialog(page).getByLabel('From', { exact: true }).inputValue() === '12:00', 'Failed save keeps draft');
    check((await state(page)).version === beforeFailure.version, 'Failed save leaves schedule unchanged');
    await page.evaluate(() => { Storage.prototype.setItem = window.calendarOriginalSetItem; delete window.calendarOriginalSetItem; });
    await tap(dialog(page).getByRole('button', { name: 'Block time', exact: true }));
    await saved(page);
    const persisted = await state(page);
    await page.reload();
    await page.locator('.availability-mobile').waitFor();
    check(JSON.stringify(await state(page)) === JSON.stringify(persisted), 'All saved changes survive reload');

    // A concurrent edit cannot silently overwrite another tab's saved settings.
    await choose(page, monday);
    await tap(page.locator('.availability-mobile-entry-blocked'));
    await peer.locator('.availability-settings-summary').click();
    await dialog(peer).getByLabel('Buffer between patients in minutes').fill('20');
    await dialog(peer).getByRole('button', { name: 'Save settings', exact: true }).click();
    await saved(peer);
    await tap(dialog(page).getByRole('button', { name: 'Save changes', exact: true }));
    await dialog(page).getByRole('alert').waitFor();
    check((await dialog(page).getByRole('alert').innerText()).includes('changed'), 'Stale mobile editor reports concurrent change');
    check((await state(page)).buffer_minutes === 20, 'Concurrent settings retained');
    await tap(dialog(page).getByRole('button', { name: 'Cancel', exact: true }));

    // Reduced visible height exercises the same resize path used by a soft keyboard.
    await tap(page.locator('.availability-settings-summary'));
    await page.setViewportSize({ width: 320, height: 360 });
    await dialog(page).getByLabel('Buffer between patients in minutes').focus();
    await page.waitForFunction(() => {
      const editor = document.querySelector('.availability-dialog');
      const field = document.activeElement?.getBoundingClientRect();
      const header = editor?.querySelector('.availability-dialog-title')?.getBoundingClientRect();
      const footer = editor?.querySelector('.availability-actions')?.getBoundingClientRect();
      return editor?.getBoundingClientRect().bottom <= visualViewport.offsetTop + visualViewport.height + 1 && field?.top >= header?.bottom && field?.bottom <= footer?.top;
    });
    checks++;
    await layout(page);
    await tap(dialog(page).getByRole('button', { name: 'Cancel', exact: true }));
    check(errors.length === 0, `No runtime errors: ${errors.join('; ')}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${out}/${engine}-day.png`, fullPage: true });
    await context.close();

    // Mouse/desktop and tablet retain the seven-column calendar.
    for (const width of [768, 1280, 1440]) {
      const desktop = await browser.newPage({ viewport: { width, height: 1000 } });
      await desktop.goto(url);
      await desktop.locator('.availability-week-scroll').waitFor();
      check(await desktop.locator('.availability-mobile').count() === 0, 'Desktop does not receive phone UI');
      check(await desktop.locator('.availability-day-heads>button').count() === 7, 'Desktop retains all seven columns');
      if (width === 1440) await desktop.screenshot({ path: `${out}/${engine}-desktop-after.png`, fullPage: true });
      await desktop.close();
    }
    console.log(`${engine}: phone workflows and responsive checks passed`);
  } finally { await browser.close(); }
}
console.log(`${checks} browser assertions passed`);
