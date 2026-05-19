## 1. Backend

- [ ] 1.1 Flyway `V10__birthdays.sql` adds `birthday VARCHAR(5)` (nullable) and `last_birthday_topup_year INTEGER` (nullable) to `users`, plus a CHECK constraint on `birthday` matching `^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$`.
- [ ] 1.2 Update `User` entity with the two new fields + getters/setters.
- [ ] 1.3 Extend `AppProperties.Allowance` with `birthdayTopUp` (int); `application.yml` reads `${BIRTHDAY_TOP_UP:20}`. Document `BIRTHDAY_TOP_UP` in `backend/.env.example`.
- [ ] 1.4 Implement `BirthdayService.applyTopupIfNeeded(user)`: uses `java.time.MonthDay` parsed from `users.birthday`, compares against `MonthDay.from(LocalDate.now(ZoneId.of("Asia/Manila")))`; if it matches AND `lastBirthdayTopupYear != currentYear`, increment `givingBalance` by `props.allowance().birthdayTopUp()`, set `lastBirthdayTopupYear` to current year, save. Returns a boolean indicating whether the top-up just fired (irrelevant to caller — the user object is mutated).
- [ ] 1.5 Implement `BirthdayService.todaysBirthdays(selfId)`: streams `userRepository.findAll()`, filters by the MonthDay match, excludes `selfId`, sorts by `name` ASC.
- [ ] 1.6 Update `MeController.me()` to call `birthdayService.applyTopupIfNeeded(user)` AFTER the existing `allowance.refreshIfNeeded`; the response includes `birthday` and `birthdayTopupAppliedToday` (true iff user's birthday matches today AND lastBirthdayTopupYear == currentYear).
- [ ] 1.7 Add `PUT /api/v1/me/birthday` accepting `{birthday: string | null}`. Validates format + calendar validity (Feb 30, etc.). Returns the updated profile via the same toView() path.
- [ ] 1.8 Implement `BirthdaysController` with `GET /api/v1/birthdays/today` returning `[{id, name, email}]` from `BirthdayService.todaysBirthdays(currentUser)`.

## 2. Frontend

- [ ] 2.1 Update `MeProfile` type to add `birthday: string | null` and `birthdayTopupAppliedToday: boolean`.
- [ ] 2.2 Add `ApiService.setBirthday(birthday)` (PUT) and `ApiService.birthdaysToday()` (GET).
- [ ] 2.3 Profile page: add a birthday section. Two `<select>` (Month and Day) pre-populated from the user's saved value; an "Update" button calls `setBirthday`; a "Clear" link calls it with `null`. Show a small "🎂" badge after the date for visual flair. On save, refresh `/me`.
- [ ] 2.4 Feed page: subscribe to `/api/v1/birthdays/today` once on init. For each celebrant, render a pink banner: *"🎂 It's <Name>'s birthday today — send them recognition →"*. Clicking the link calls `@ViewChild`-grabbed `composer.prefillBirthday(user)`.
- [ ] 2.5 `ComposerComponent.prefillBirthday(user)`: adds the user to `mentionMap`, sets `text` to `+10 @<handle> Happy birthday! 🎂 #birthday `, queueMicrotask to focus the textarea and set the caret at end.
- [ ] 2.6 On `/me` resolution, if `birthdayTopupAppliedToday` is true and `localStorage[birthdayToastShown:YYYY-MM-DD]` is unset, show a celebratory mint toast "Happy birthday, <Name>! Here's an extra N pts to spread the love." plus a confetti burst via `CelebrateService`, then set the localStorage key.

## 3. Verification

- [ ] 3.1 Backend builds, AllowanceServiceTest still passes (after AppProperties update).
- [ ] 3.2 Frontend builds; lazy-loaded chunks still well under budget.
- [ ] 3.3 OpenSpec validates the new change.
- [ ] 3.4 Manually test in Postgres: set `birthday = '<today>'`, hit `/me`, confirm balance increased + `last_birthday_topup_year = <year>`; hit again, confirm no second top-up.
