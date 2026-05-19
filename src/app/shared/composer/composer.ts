import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import 'emoji-picker-element';

import { ApiService } from '../../core/api.service';
import { CelebrateService } from '../../core/celebrate.service';
import { GifResult, HashtagSuggestion, MeProfile, UserBrief } from '../../core/types';

interface Trigger {
  type: '@' | '#';
  query: string;
  start: number;
}

type TokenType = 'text' | 'amount' | 'mention' | 'hashtag';

interface Token {
  type: TokenType;
  value: string;
}

interface Parsed {
  amount: number | null;
  handles: string[];
  recipientIds: string[];
  unresolvedHandle: string | null;
  message: string;
  hashtags: string[];
  totalCost: number;
  valid: boolean;
  hint: string;
}

const TOKEN_REGEX = /(?<=^|\s)\+\d+(?=\s|$)|@[a-z0-9._-]+|#[a-z0-9_-]+/gi;

@Component({
  selector: 'app-composer',
  imports: [FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="composer">
      @if (me(); as m) {
        <div class="balance-bar">
          Giving balance:
          <strong [class.low]="m.givingBalance < 5">{{ m.givingBalance }}</strong>
          pts to give this month
        </div>
      }

      <div class="textarea-wrap">
        <div #highlights class="highlight-layer" aria-hidden="true">
          @for (tok of tokens(); track $index) {
            @switch (tok.type) {
              @case ('amount') {
                <span class="t-amount">{{ tok.value }}</span>
              }
              @case ('mention') {
                <span class="t-mention" [class.unresolved]="!isResolved(tok.value)">{{ tok.value }}</span>
              }
              @case ('hashtag') {
                <span class="t-hashtag">{{ tok.value }}</span>
              }
              @default {
                <span>{{ tok.value }}</span>
              }
            }
          }<span class="trailing">&#8203;</span>
        </div>

        <textarea
          #textarea
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
          (input)="onInput()"
          (keydown)="onKeyDown($event)"
          (keyup)="onCursorMove()"
          (click)="onCursorMove()"
          (scroll)="onScroll()"
          placeholder="+10 @teammate great work on the migration! #teamwork"
          rows="3"
          spellcheck="false"
          aria-label="Give a recognition"
        ></textarea>

        @if (trigger(); as t) {
          <ul #dropdown class="dropdown" role="listbox">
            @if (t.type === '@') {
              @if (filteredUsers().length === 0) {
                <li class="empty">no matching teammates</li>
              }
              @for (u of filteredUsers(); track u.id; let i = $index) {
                <li
                  [class.active]="i === selectedIndex()"
                  (mousedown)="pickUser($event, u)"
                  (mouseenter)="selectedIndex.set(i)"
                  role="option"
                >
                  <span class="primary">{{ u.name }}</span>
                  <span class="secondary">{{ '@' + handleOf(u) }}</span>
                </li>
              }
            } @else {
              @if (showCreateNew()) {
                <li
                  [class.active]="0 === selectedIndex()"
                  (mousedown)="pickHashtag($event, t.query)"
                  (mouseenter)="selectedIndex.set(0)"
                  class="create-new"
                  role="option"
                >
                  <span class="primary">Create new <strong>#{{ t.query }}</strong></span>
                </li>
              }
              @for (h of filteredHashtags(); track h.tag; let i = $index) {
                <li
                  [class.active]="i + (showCreateNew() ? 1 : 0) === selectedIndex()"
                  (mousedown)="pickHashtag($event, h.tag)"
                  (mouseenter)="selectedIndex.set(i + (showCreateNew() ? 1 : 0))"
                  role="option"
                >
                  <span class="primary">#{{ h.tag }}</span>
                  <span class="secondary">{{ h.usageCount }} use{{ h.usageCount === 1 ? '' : 's' }}</span>
                </li>
              }
            }
          </ul>
        }
      </div>

      <div class="picker-row">
        <button
          type="button"
          class="picker-btn"
          [class.active]="openPanel() === 'emoji'"
          (click)="togglePanel('emoji')"
          aria-label="Insert emoji"
          title="Insert emoji"
        >😊</button>
        <button
          type="button"
          class="picker-btn"
          [class.active]="openPanel() === 'gif'"
          (click)="togglePanel('gif')"
          aria-label="Attach GIF"
          title="Attach GIF"
        >GIF</button>
        @if (attachedGif(); as gif) {
          <span class="gif-pill" title="Attached GIF">
            <img [src]="gif.previewUrl" [alt]="gif.alt" />
            <button type="button" (click)="clearGif()" aria-label="Remove GIF">×</button>
          </span>
        }
      </div>

      @if (openPanel() === 'emoji') {
        <div class="picker-panel emoji-panel">
          <emoji-picker (emoji-click)="onEmojiClick($event)"></emoji-picker>
        </div>
      }

      @if (openPanel() === 'gif') {
        <div class="picker-panel gif-panel">
          <input
            type="text"
            class="gif-search"
            [ngModel]="gifQuery()"
            (ngModelChange)="onGifQuery($event)"
            placeholder="Search Giphy for a GIF…"
            autocomplete="off"
          />
          @if (gifError()) {
            <p class="error small">{{ gifError() }}</p>
          } @else if (gifLoading()) {
            <p class="muted small">Searching…</p>
          } @else if (gifResults().length === 0 && gifQuery().trim() !== '') {
            <p class="muted small">No GIFs for "{{ gifQuery() }}"</p>
          }
          <div class="gif-grid">
            @for (g of gifResults(); track g.id) {
              <button type="button" class="gif-cell" (click)="attachGif(g)" [attr.aria-label]="g.alt || 'GIF'">
                <img [src]="g.previewUrl" [alt]="g.alt" />
              </button>
            }
          </div>
        </div>
      }

      <div class="preview" [class.invalid]="!parsed().valid">
        @if (parsed().valid) {
          <span class="part recipients">
            →
            @for (h of parsed().handles; track h; let last = $last) {
              <strong>{{ nameOfHandle(h) }}</strong>@if (!last) {<span>,&nbsp;</span>}
            }
          </span>
          <span class="part cost">
            {{ parsed().amount }} pts × {{ parsed().handles.length }} =
            <strong>{{ parsed().totalCost }}</strong>
          </span>
          <span class="part tags">
            @for (t of parsed().hashtags; track t) {
              <span class="chip">#{{ t }}</span>
            }
          </span>
        } @else {
          <span class="hint">{{ parsed().hint }}</span>
        }
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="actions">
        <button
          type="button"
          class="send"
          (click)="submit()"
          [disabled]="!parsed().valid || submitting()"
        >
          {{ submitting() ? 'Sending…' : 'Give recognition' }}
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .composer {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 14px;
        padding: 1rem 1.25rem;
        box-shadow: 0 2px 10px rgba(17, 24, 39, 0.06);
      }
      .balance-bar {
        font-size: 0.85rem;
        color: var(--rise-muted);
        margin-bottom: 0.5rem;
      }
      .balance-bar strong {
        color: var(--rise-pink);
        background: var(--rise-pink-soft);
        padding: 0.1rem 0.55rem;
        border-radius: 999px;
        margin-right: 0.15rem;
      }
      .balance-bar strong.low {
        background: var(--rise-error-soft);
        color: var(--rise-error);
      }
      .textarea-wrap {
        position: relative;
        background: white;
        border-radius: 10px;
      }
      .highlight-layer,
      textarea {
        font-family: inherit;
        font-size: 1rem;
        line-height: 1.5;
        letter-spacing: normal;
        padding: 0.7rem 0.85rem;
        margin: 0;
        border: 1px solid transparent;
        border-radius: 10px;
        width: 100%;
        box-sizing: border-box;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
        tab-size: 4;
      }
      .highlight-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        color: var(--rise-ink);
        overflow: hidden;
      }
      .highlight-layer .trailing {
        display: inline-block;
        width: 0;
      }
      textarea {
        position: relative;
        background: transparent;
        color: transparent;
        caret-color: var(--rise-ink);
        resize: vertical;
        min-height: 5rem;
        border-color: var(--rise-line-strong);
      }
      textarea::placeholder {
        color: var(--rise-muted-soft);
      }
      textarea:focus {
        outline: 2px solid var(--rise-pink);
        outline-offset: -1px;
      }
      /* Inline token highlights — padding/negative-margin keeps the visual chip
         from shifting the underlying textarea characters out of alignment. */
      .t-amount,
      .t-mention,
      .t-hashtag {
        border-radius: 4px;
        padding: 1px 3px;
        margin: -1px -3px;
      }
      .t-amount {
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        font-weight: 600;
      }
      .t-mention {
        background: var(--rise-cyan-soft);
        color: var(--rise-cyan);
        font-weight: 500;
      }
      .t-mention.unresolved {
        background: var(--rise-error-soft);
        color: var(--rise-error);
        text-decoration: underline dotted;
      }
      .t-hashtag {
        background: var(--rise-purple-soft);
        color: var(--rise-purple);
        font-weight: 500;
      }
      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin: 0.25rem 0 0;
        padding: 0.25rem 0;
        list-style: none;
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 10px;
        max-height: 240px;
        overflow: auto;
        z-index: 50;
        box-shadow: 0 14px 32px rgba(17, 24, 39, 0.18);
        color: var(--rise-ink);
      }
      .dropdown li {
        padding: 0.5rem 0.85rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
      }
      .dropdown li.active {
        background: var(--rise-pink-tint);
      }
      .dropdown li.create-new {
        color: var(--rise-pink-deep);
        font-weight: 500;
      }
      .dropdown li.create-new.active {
        background: var(--rise-pink-soft);
      }
      .dropdown .empty {
        color: var(--rise-muted-soft);
        font-style: italic;
        cursor: default;
      }
      .dropdown .empty:hover {
        background: transparent;
      }
      .dropdown .secondary {
        color: var(--rise-muted);
        font-size: 0.82rem;
      }
      .preview {
        margin-top: 0.7rem;
        font-size: 0.85rem;
        color: var(--rise-ink);
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 0.85rem;
        align-items: baseline;
      }
      .preview.invalid {
        color: var(--rise-muted-soft);
      }
      .preview .hint {
        font-style: italic;
      }
      .preview .part {
        display: inline-flex;
        align-items: baseline;
        gap: 0.25rem;
      }
      .preview .cost {
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
        font-weight: 600;
      }
      .chip {
        background: var(--rise-purple-soft);
        color: var(--rise-purple);
        padding: 0.1rem 0.55rem;
        border-radius: 999px;
        font-size: 0.78rem;
      }
      .picker-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-top: 0.6rem;
        flex-wrap: wrap;
      }
      .picker-btn {
        background: white;
        border: 1px solid var(--rise-line);
        color: var(--rise-muted);
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        transition: border-color 0.12s ease, color 0.12s ease;
      }
      .picker-btn:hover {
        border-color: var(--rise-pink);
        color: var(--rise-pink);
      }
      .picker-btn.active {
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        border-color: var(--rise-pink);
      }
      .gif-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: var(--rise-pink-tint);
        border: 1px solid var(--rise-pink-soft);
        padding: 0.2rem 0.4rem 0.2rem 0.2rem;
        border-radius: 999px;
      }
      .gif-pill img {
        width: 28px;
        height: 28px;
        object-fit: cover;
        border-radius: 50%;
      }
      .gif-pill button {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--rise-pink-deep);
        font-size: 1.1rem;
        line-height: 1;
        padding: 0 0.25rem;
      }
      .picker-panel {
        margin-top: 0.6rem;
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        background: var(--rise-card);
        box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
        overflow: hidden;
      }
      .emoji-panel {
        display: flex;
        justify-content: center;
      }
      .gif-panel {
        padding: 0.6rem 0.7rem 0.7rem;
      }
      .gif-search {
        width: 100%;
        padding: 0.5rem 0.7rem;
        font-size: 0.95rem;
        border: 1px solid var(--rise-line-strong);
        border-radius: 8px;
        margin-bottom: 0.5rem;
        box-sizing: border-box;
      }
      .gif-search:focus {
        outline: 2px solid var(--rise-pink);
        outline-offset: -1px;
      }
      .gif-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.35rem;
        max-height: 280px;
        overflow-y: auto;
      }
      .gif-cell {
        padding: 0;
        margin: 0;
        border: 1px solid var(--rise-line);
        border-radius: 8px;
        overflow: hidden;
        background: var(--rise-body);
        cursor: pointer;
      }
      .gif-cell img {
        width: 100%;
        display: block;
        aspect-ratio: 4 / 3;
        object-fit: cover;
      }
      .gif-cell:hover {
        border-color: var(--rise-pink);
      }
      .small {
        font-size: 0.82rem;
        margin: 0.2rem 0;
      }
      .muted {
        color: var(--rise-muted);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.8rem;
      }
      .send {
        background: var(--rise-pink);
        color: white;
        border: none;
        padding: 0.55rem 1.5rem;
        font-weight: 600;
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.05s ease;
      }
      .send:hover:not(:disabled) {
        background: var(--rise-pink-deep);
      }
      .send:active:not(:disabled) {
        transform: translateY(1px);
      }
      .send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .error {
        color: var(--rise-error);
        margin: 0.5rem 0 0;
      }
    `,
  ],
})
export class ComposerComponent implements AfterViewInit {
  private readonly api = inject(ApiService);
  private readonly celebrate = inject(CelebrateService);
  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('textarea', { static: true }) private taRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('highlights', { static: true }) private highlightsRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dropdown') private dropdownRef?: ElementRef<HTMLUListElement>;

  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    const inside = this.host.nativeElement.contains(event.target as Node);
    if (inside) return;
    // Click landed outside the composer — close every popup.
    if (this.openPanel() !== null) this.openPanel.set(null);
    if (this.trigger() !== null) this.trigger.set(null);
  }

  @Output() posted = new EventEmitter<void>();

  protected readonly text = signal('');
  protected readonly trigger = signal<Trigger | null>(null);
  protected readonly selectedIndex = signal(0);
  protected readonly me = signal<MeProfile | null>(null);
  protected readonly users = signal<UserBrief[]>([]);
  protected readonly hashtagsList = signal<HashtagSuggestion[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly openPanel = signal<'emoji' | 'gif' | null>(null);
  protected readonly attachedGif = signal<GifResult | null>(null);
  protected readonly gifQuery = signal('');
  protected readonly gifResults = signal<GifResult[]>([]);
  protected readonly gifLoading = signal(false);
  protected readonly gifError = signal<string | null>(null);
  private gifDebounce?: number;

  private readonly mentionMap = new Map<string, { id: string; name: string }>();

  protected readonly tokens = computed<Token[]>(() => {
    const text = this.text();
    const result: Token[] = [];
    TOKEN_REGEX.lastIndex = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_REGEX.exec(text)) !== null) {
      if (m.index > last) {
        result.push({ type: 'text', value: text.substring(last, m.index) });
      }
      const v = m[0];
      let type: TokenType;
      if (v.startsWith('+')) type = 'amount';
      else if (v.startsWith('@')) type = 'mention';
      else type = 'hashtag';
      result.push({ type, value: v });
      last = m.index + v.length;
    }
    if (last < text.length) {
      result.push({ type: 'text', value: text.substring(last) });
    }
    return result;
  });

  protected readonly filteredUsers = computed(() => {
    const t = this.trigger();
    if (!t || t.type !== '@') return [];
    const me = this.me();
    const q = t.query.toLowerCase();
    return this.users()
      .filter((u) => !me || u.id !== me.id)
      .filter((u) => q === '' || this.handleOf(u).startsWith(q) || u.name.toLowerCase().includes(q))
      .slice(0, 10);
  });

  protected readonly filteredHashtags = computed(() => {
    const t = this.trigger();
    if (!t || t.type !== '#') return [];
    const q = t.query.toLowerCase();
    return this.hashtagsList()
      .filter((h) => q === '' || h.tag.startsWith(q))
      .slice(0, 10);
  });

  protected readonly showCreateNew = computed(() => {
    const t = this.trigger();
    if (!t || t.type !== '#') return false;
    const q = t.query.toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(q)) return false;
    return !this.hashtagsList().some((h) => h.tag === q);
  });

  protected readonly parsed = computed<Parsed>(() => {
    const raw = this.text();

    let amount: number | null = null;
    const amtMatch = raw.match(/(?:^|\s)\+(\d+)(?=\s|$)/);
    if (amtMatch) amount = parseInt(amtMatch[1], 10);

    const handlesRaw: string[] = [];
    for (const m of raw.matchAll(/@([a-z0-9._-]+)/gi)) handlesRaw.push(m[1].toLowerCase());
    const handles = Array.from(new Set(handlesRaw));

    const tagsRaw: string[] = [];
    for (const m of raw.matchAll(/#([a-z0-9_-]+)/gi)) tagsRaw.push(m[1].toLowerCase());
    const hashtags = Array.from(new Set(tagsRaw));

    let unresolvedHandle: string | null = null;
    const recipientIds: string[] = [];
    for (const h of handles) {
      const hit = this.mentionMap.get(h);
      if (hit) recipientIds.push(hit.id);
      else {
        unresolvedHandle = h;
        break;
      }
    }

    const message = raw
      .replace(/(?:^|\s)\+\d+(?=\s|$)/g, ' ')
      .replace(/@[a-z0-9._-]+/gi, ' ')
      .replace(/#[a-z0-9_-]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let valid = true;
    let hint = '';
    if (handles.length === 0) {
      valid = false;
      hint = 'Type @ to mention a teammate';
    } else if (unresolvedHandle) {
      valid = false;
      hint = `Unknown mention: @${unresolvedHandle} (pick from the dropdown)`;
    } else if (amount == null) {
      valid = false;
      hint = 'Add a +N amount (e.g., +10)';
    } else if (amount <= 0) {
      valid = false;
      hint = 'Amount must be positive';
    } else if (!message) {
      valid = false;
      hint = 'Add a message describing why';
    }

    const totalCost = amount != null && recipientIds.length ? amount * recipientIds.length : 0;
    if (valid) {
      const me = this.me();
      if (me && totalCost > me.givingBalance) {
        valid = false;
        hint = `Total cost ${totalCost} exceeds your remaining ${me.givingBalance}`;
      }
    }

    return {
      amount,
      handles,
      recipientIds,
      unresolvedHandle,
      message,
      hashtags,
      totalCost,
      valid,
      hint,
    };
  });

  constructor() {
    this.refreshMe();
    this.api.listUsers().subscribe({ next: (us) => this.users.set(us) });
    this.api.hashtags().subscribe({ next: (hs) => this.hashtagsList.set(hs) });
  }

  ngAfterViewInit(): void {
    this.taRef.nativeElement.focus();
  }

  /**
   * Public hook called by the Feed page when the user clicks a birthday
   * banner. Drops the recipient into the mention map and primes the textarea
   * with a birthday-themed recognition that the user can tweak before sending.
   */
  public prefillBirthday(user: { id: string; name: string; email: string }): void {
    const handle = this.handleOf(user);
    this.mentionMap.set(handle, { id: user.id, name: user.name });
    const message = `+10 @${handle} Happy birthday! 🎂 #birthday `;
    this.text.set(message);
    this.attachedGif.set(null);
    this.openPanel.set(null);
    this.trigger.set(null);
    queueMicrotask(() => {
      const ta = this.taRef.nativeElement;
      ta.focus();
      ta.setSelectionRange(message.length, message.length);
      this.onScroll();
    });
  }

  protected onInput(): void {
    this.trigger.set(this.detectTrigger());
    this.selectedIndex.set(0);
    this.onScroll();
  }

  protected onCursorMove(): void {
    // Caret moves (arrow keys, click) recompute the trigger but don't reset
    // the selectedIndex if the trigger context didn't change.
    const prev = this.trigger();
    const next = this.detectTrigger();
    if (!prev || !next || prev.type !== next.type || prev.start !== next.start) {
      this.selectedIndex.set(0);
    }
    this.trigger.set(next);
  }

  protected onScroll(): void {
    const ta = this.taRef.nativeElement;
    const hl = this.highlightsRef.nativeElement;
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const t = this.trigger();
    if (!t) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.trigger.set(null);
      return;
    }

    const len = this.currentOptionsLength();
    if (len === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % len);
      this.scrollSelectedIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + len) % len);
      this.scrollSelectedIntoView();
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.pickSelected();
    }
  }

  private currentOptionsLength(): number {
    const t = this.trigger();
    if (!t) return 0;
    if (t.type === '@') return this.filteredUsers().length;
    return this.filteredHashtags().length + (this.showCreateNew() ? 1 : 0);
  }

  private pickSelected(): void {
    const t = this.trigger();
    if (!t) return;
    const idx = this.selectedIndex();
    if (t.type === '@') {
      const u = this.filteredUsers()[idx];
      if (u) this.pickUser(new MouseEvent('mousedown'), u);
      return;
    }
    const showCreate = this.showCreateNew();
    if (showCreate && idx === 0) {
      this.pickHashtag(new MouseEvent('mousedown'), t.query);
      return;
    }
    const offset = showCreate ? 1 : 0;
    const h = this.filteredHashtags()[idx - offset];
    if (h) this.pickHashtag(new MouseEvent('mousedown'), h.tag);
  }

  private scrollSelectedIntoView(): void {
    queueMicrotask(() => {
      const list = this.dropdownRef?.nativeElement;
      if (!list) return;
      const item = list.children.item(this.selectedIndex()) as HTMLElement | null;
      item?.scrollIntoView({ block: 'nearest' });
    });
  }

  protected pickUser(event: MouseEvent, user: UserBrief): void {
    event.preventDefault();
    const t = this.trigger();
    if (!t) return;
    const handle = this.handleOf(user);
    this.mentionMap.set(handle, { id: user.id, name: user.name });
    this.replaceTrigger(t, `@${handle}`);
  }

  protected pickHashtag(event: MouseEvent, tag: string): void {
    event.preventDefault();
    const t = this.trigger();
    if (!t) return;
    const clean = tag.toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(clean)) return;
    this.replaceTrigger(t, `#${clean}`);
  }

  protected handleOf(u: UserBrief): string {
    const at = u.email.indexOf('@');
    return (at > 0 ? u.email.substring(0, at) : u.email).toLowerCase();
  }

  protected nameOfHandle(handle: string): string {
    return this.mentionMap.get(handle)?.name ?? `@${handle}`;
  }

  protected isResolved(mentionToken: string): boolean {
    const handle = mentionToken.substring(1).toLowerCase();
    return this.mentionMap.has(handle);
  }

  protected submit(): void {
    const p = this.parsed();
    if (!p.valid || p.amount == null) return;
    this.error.set(null);
    this.submitting.set(true);
    const gif = this.attachedGif();
    this.api
      .give({
        recipientIds: p.recipientIds,
        amount: p.amount,
        message: p.message,
        hashtags: p.hashtags,
        gifUrl: gif?.gifUrl,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.text.set('');
          this.mentionMap.clear();
          this.trigger.set(null);
          this.attachedGif.set(null);
          this.openPanel.set(null);
          this.celebrate.recognition();
          this.refreshMe();
          this.api.hashtags().subscribe({ next: (hs) => this.hashtagsList.set(hs) });
          this.posted.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.message ?? 'failed to send');
        },
      });
  }

  protected togglePanel(which: 'emoji' | 'gif'): void {
    this.openPanel.update((curr) => (curr === which ? null : which));
    if (which === 'gif' && this.gifResults().length === 0 && !this.gifQuery()) {
      this.fetchGifs('thank you');
    }
  }

  protected onEmojiClick(event: Event): void {
    const detail = (event as CustomEvent<{ unicode?: string }>).detail;
    const emoji = detail?.unicode;
    if (!emoji) return;
    const ta = this.taRef.nativeElement;
    const start = ta.selectionStart ?? this.text().length;
    const end = ta.selectionEnd ?? start;
    const val = ta.value;
    const next = val.substring(0, start) + emoji + val.substring(end);
    this.text.set(next);
    queueMicrotask(() => {
      ta.focus();
      const caret = start + emoji.length;
      ta.setSelectionRange(caret, caret);
    });
  }

  protected onGifQuery(q: string): void {
    this.gifQuery.set(q);
    window.clearTimeout(this.gifDebounce);
    this.gifDebounce = window.setTimeout(() => this.fetchGifs(q.trim()), 300);
  }

  protected attachGif(g: GifResult): void {
    this.attachedGif.set(g);
    this.openPanel.set(null);
  }

  protected clearGif(): void {
    this.attachedGif.set(null);
  }

  private fetchGifs(q: string): void {
    if (!q) {
      this.gifResults.set([]);
      this.gifError.set(null);
      return;
    }
    this.gifLoading.set(true);
    this.gifError.set(null);
    this.api.gifs(q).subscribe({
      next: (res) => {
        this.gifResults.set(res);
        this.gifLoading.set(false);
      },
      error: (err) => {
        this.gifLoading.set(false);
        this.gifResults.set([]);
        this.gifError.set(err?.error?.message ?? 'gif search failed');
      },
    });
  }

  private refreshMe(): void {
    this.api.me().subscribe({ next: (m) => this.me.set(m) });
  }

  private detectTrigger(): Trigger | null {
    const ta = this.taRef.nativeElement;
    const caret = ta.selectionStart ?? 0;
    const val = ta.value;
    let pos = caret - 1;
    while (pos >= 0) {
      const ch = val[pos];
      if (ch === '@' || ch === '#') {
        const query = val.substring(pos + 1, caret);
        if (/^[a-z0-9._-]*$/i.test(query)) {
          return { type: ch as '@' | '#', query, start: pos };
        }
        return null;
      }
      if (/\s/.test(ch)) return null;
      pos--;
    }
    return null;
  }

  private replaceTrigger(t: Trigger, replacement: string): void {
    const ta = this.taRef.nativeElement;
    const val = ta.value;
    const before = val.substring(0, t.start);
    const afterStart = t.start + 1 + t.query.length;
    const after = val.substring(afterStart);
    const insert = `${replacement} `;
    const next = before + insert + after;
    this.text.set(next);
    this.trigger.set(null);
    queueMicrotask(() => {
      const caret = before.length + insert.length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }
}
