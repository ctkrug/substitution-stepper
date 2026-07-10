import { Sfx } from "../app/audio";
import { EXAMPLES } from "../app/examples";
import {
  AppState,
  current,
  highlightPath,
  initialState,
  isAtValue,
  jumpTo,
  load,
  reset,
  stepBack,
  stepForward,
} from "../app/state";
import { print } from "../interpreter/printer";
import { renderBoardHtml } from "./board";

const PLAY_INTERVAL_MS = 700;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Owns the board's DOM and wires it to the pure state machine in app/state.
 * Everything that can be tested as data lives there; this class is purely
 * the render + event-binding layer.
 */
export class SubstitutionApp {
  private state: AppState;
  private readonly sfx = new Sfx();
  private playHandle: number | null = null;
  private wasAtValue = false;

  private readonly root: HTMLElement;
  private readonly sourceInput: HTMLTextAreaElement;
  private readonly board: HTMLDivElement;
  private readonly boardContent: HTMLDivElement;
  private readonly boardStatus: HTMLDivElement;
  private readonly boardError: HTMLDivElement;
  private readonly historyList: HTMLOListElement;
  private readonly stepBtn: HTMLButtonElement;
  private readonly backBtn: HTMLButtonElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly loadBtn: HTMLButtonElement;
  private readonly examplesRow: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = initialState(EXAMPLES[0].source);

    const shell = this.buildShell();
    this.sourceInput = shell.sourceInput;
    this.board = shell.board;
    this.boardContent = shell.boardContent;
    this.boardStatus = shell.boardStatus;
    this.boardError = shell.boardError;
    this.historyList = shell.historyList;
    this.stepBtn = shell.stepBtn;
    this.backBtn = shell.backBtn;
    this.playBtn = shell.playBtn;
    this.resetBtn = shell.resetBtn;
    this.muteBtn = shell.muteBtn;
    this.loadBtn = shell.loadBtn;
    this.examplesRow = shell.examplesRow;

    this.root.appendChild(shell.root);
    this.bindEvents();
    this.render();
  }

  private buildShell() {
    const root = el("div", "app-shell");

    const header = el("header", "app-header");
    const wordmark = el("h1", "wordmark");
    wordmark.innerHTML =
      '<span class="wordmark__glyph">&lambda;</span>Substitution Stepper';
    const muteBtn = el("button", "icon-btn mute-btn");
    muteBtn.type = "button";
    header.append(wordmark, muteBtn);

    const layout = el("main", "layout");

    const boardPane = el("section", "board-pane");
    boardPane.setAttribute("aria-label", "Expression board");
    const board = el("div", "board");
    board.id = "board";
    board.setAttribute("aria-live", "polite");
    const boardContent = el("div", "board-content");
    board.appendChild(boardContent);
    const boardStatus = el("div", "board-status");
    boardStatus.setAttribute("role", "status");
    boardStatus.setAttribute("aria-live", "polite");
    const boardError = el("div", "board-error");
    boardError.setAttribute("role", "alert");
    boardError.hidden = true;
    boardPane.append(board, boardStatus, boardError);

    const controlPane = el("aside", "control-pane");

    const editorBlock = el("div", "panel editor-block");
    const editorLabel = el("label", "panel-label");
    editorLabel.htmlFor = "source-input";
    editorLabel.textContent = "Scheme source";
    const sourceInput = el("textarea", "source-input");
    sourceInput.id = "source-input";
    sourceInput.spellcheck = false;
    sourceInput.value = this.state.source;
    const examplesRow = el("div", "examples-row");
    examplesRow.setAttribute("role", "group");
    examplesRow.setAttribute("aria-label", "Load an example");
    const loadBtn = el("button", "btn btn--primary load-btn");
    loadBtn.type = "button";
    loadBtn.textContent = "Load";
    editorBlock.append(editorLabel, sourceInput, examplesRow, loadBtn);

    const controlsBlock = el("div", "panel controls-block");
    const backBtn = el("button", "btn btn--control");
    backBtn.type = "button";
    backBtn.textContent = "◀ Back";
    backBtn.setAttribute("aria-label", "Step back");
    const stepBtn = el("button", "btn btn--control btn--accent");
    stepBtn.type = "button";
    stepBtn.textContent = "Step ▶";
    stepBtn.setAttribute("aria-label", "Step forward");
    const playBtn = el("button", "btn btn--control");
    playBtn.type = "button";
    playBtn.textContent = "Play";
    const resetBtn = el("button", "btn btn--control");
    resetBtn.type = "button";
    resetBtn.textContent = "Reset";
    controlsBlock.append(backBtn, stepBtn, playBtn, resetBtn);

    const historyBlock = el("div", "panel history-block");
    const historyHeading = el("h2", "panel-label");
    historyHeading.textContent = "History";
    const historyList = el("ol", "history-list");
    historyBlock.append(historyHeading, historyList);

    controlPane.append(editorBlock, controlsBlock, historyBlock);
    layout.append(boardPane, controlPane);
    root.append(header, layout);

    return {
      root,
      sourceInput,
      board,
      boardContent,
      boardStatus,
      boardError,
      historyList,
      stepBtn,
      backBtn,
      playBtn,
      resetBtn,
      muteBtn,
      loadBtn,
      examplesRow,
    };
  }

  private bindEvents(): void {
    for (const example of EXAMPLES) {
      const chip = el("button", "btn btn--chip");
      chip.type = "button";
      chip.textContent = example.name;
      chip.addEventListener("click", () => {
        this.sourceInput.value = example.source;
        this.doLoad(example.source);
      });
      this.examplesRow.appendChild(chip);
    }

    this.loadBtn.addEventListener("click", () =>
      this.doLoad(this.sourceInput.value),
    );
    this.stepBtn.addEventListener("click", () => this.doStep());
    this.backBtn.addEventListener("click", () => this.doBack());
    this.resetBtn.addEventListener("click", () => this.doReset());
    this.playBtn.addEventListener("click", () => this.togglePlay());
    this.muteBtn.addEventListener("click", () => {
      this.sfx.toggleMuted();
      this.render();
    });
    this.historyList.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const item = target.closest<HTMLLIElement>("[data-index]");
      if (!item) return;
      this.stopPlay();
      this.state = jumpTo(this.state, Number(item.dataset.index));
      this.render();
    });

    document.addEventListener("keydown", (event) => {
      if (event.target === this.sourceInput) return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        this.doStep();
      } else if (event.key === "ArrowLeft" || event.key === "Backspace") {
        event.preventDefault();
        this.doBack();
      }
    });
  }

  private doLoad(source: string): void {
    this.stopPlay();
    this.state = load(this.state, source);
    this.wasAtValue = isAtValue(this.state);
    if (this.state.error) this.sfx.error();
    this.render();
  }

  private doStep(): void {
    if (isAtValue(this.state)) return;
    const before = this.state.error;
    this.state = stepForward(this.state);
    if (this.state.error && this.state.error !== before) {
      this.sfx.error();
    } else if (!this.state.error) {
      this.sfx.step();
    }
    const nowAtValue = isAtValue(this.state);
    if (nowAtValue && !this.wasAtValue) {
      this.sfx.win();
      this.celebrate();
      this.stopPlay();
    }
    this.wasAtValue = nowAtValue;
    this.render();
  }

  private doBack(): void {
    this.stopPlay();
    this.state = stepBack(this.state);
    this.wasAtValue = isAtValue(this.state);
    this.render();
  }

  private doReset(): void {
    this.stopPlay();
    this.state = reset(this.state);
    this.wasAtValue = isAtValue(this.state);
    this.render();
  }

  private togglePlay(): void {
    if (this.playHandle !== null) {
      this.stopPlay();
      this.render();
      return;
    }
    if (isAtValue(this.state)) return;
    this.playHandle = window.setInterval(() => {
      this.doStep();
      if (isAtValue(this.state) || this.state.error) this.stopPlay();
    }, PLAY_INTERVAL_MS);
    this.render();
  }

  private stopPlay(): void {
    if (this.playHandle !== null) {
      window.clearInterval(this.playHandle);
      this.playHandle = null;
    }
  }

  private celebrate(): void {
    this.board.classList.remove("board--celebrate");
    // Force reflow so re-triggering the animation on repeated wins restarts it.
    void this.board.offsetWidth;
    this.board.classList.add("board--celebrate");
    if (prefersReducedMotion()) return;
    for (let i = 0; i < 18; i++) {
      const dust = el("span", "chalk-dust");
      dust.style.setProperty(
        "--dx",
        `${Math.round((Math.random() - 0.5) * 240)}px`,
      );
      dust.style.setProperty(
        "--rot",
        `${Math.round((Math.random() - 0.5) * 360)}deg`,
      );
      dust.style.setProperty("--delay", `${Math.round(Math.random() * 120)}ms`);
      dust.style.left = `${40 + Math.random() * 20}%`;
      this.board.appendChild(dust);
      dust.addEventListener("animationend", () => dust.remove());
    }
  }

  private render(): void {
    const node = current(this.state);
    const loaded = node !== null;

    if (node) {
      this.boardContent.innerHTML = renderBoardHtml(
        node,
        highlightPath(this.state),
      );
    } else {
      this.boardContent.innerHTML =
        '<p class="board-empty">Nothing on the board yet. Paste a definition and a call, or pick an example, then hit <strong>Load</strong>.</p>';
    }

    if (loaded) {
      const total = this.state.history.length - 1;
      const at = this.state.index;
      const done = isAtValue(this.state);
      this.boardStatus.textContent = done
        ? `Reached the final value in ${total} step${total === 1 ? "" : "s"}.`
        : `Step ${at} of ${total}`;
    } else {
      this.boardStatus.textContent = "";
    }

    if (this.state.error) {
      this.boardError.hidden = false;
      this.boardError.textContent = this.state.error;
    } else {
      this.boardError.hidden = true;
      this.boardError.textContent = "";
    }

    const atValue = isAtValue(this.state);
    this.stepBtn.disabled = !loaded || atValue;
    this.backBtn.disabled = !loaded || this.state.index === 0;
    this.playBtn.disabled = !loaded || (atValue && this.playHandle === null);
    this.playBtn.textContent = this.playHandle !== null ? "Pause" : "Play";
    this.resetBtn.disabled = !loaded;

    this.muteBtn.textContent = this.sfx.isMuted() ? "Sound: off" : "Sound: on";
    this.muteBtn.setAttribute("aria-pressed", String(this.sfx.isMuted()));
    this.muteBtn.setAttribute(
      "aria-label",
      this.sfx.isMuted() ? "Unmute sound effects" : "Mute sound effects",
    );

    this.renderHistory();
  }

  private renderHistory(): void {
    this.historyList.innerHTML = "";
    this.state.history.forEach((entry, i) => {
      const item = el("li", "history-item");
      item.dataset.index = String(i);
      if (i === this.state.index) {
        item.classList.add("history-item--current");
        item.setAttribute("aria-current", "step");
      }
      const button = el("button", "history-item__btn");
      button.type = "button";
      button.textContent = `${i}. ${print(entry)}`;
      item.appendChild(button);
      this.historyList.appendChild(item);
    });
  }
}
