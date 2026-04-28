# Stack & Balance — Git Workflow

> Guida pratica all'uso di GitHub per ottimizzare lo sviluppo.

---

## 🚀 First push (one-time setup)

Eseguito `git init` localmente. Restano 3 step per collegare al GitHub:

```bash
# 1. Aggiungi remote (HTTPS o SSH)
git remote add origin https://github.com/francescobee/Stack-Balance.git
# oppure SSH se hai chiave configurata:
# git remote add origin git@github.com:francescobee/Stack-Balance.git

# 2. Verifica
git remote -v

# 3. Push iniziale (forzato perché GitHub potrebbe avere già un README)
git push -u origin main
# Se GitHub ha auto-creato un README, fai prima:
#   git pull origin main --allow-unrelated-histories
#   (risolvi conflitti se presenti)
#   git push -u origin main
```

**Auth**: per HTTPS, GitHub chiede un Personal Access Token (PAT) come
password (Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate new). Per SSH serve la chiave registrata
in Settings → SSH keys.

---

## 🌐 GitHub Pages (live demo)

Il progetto è 100% statico (vanilla JS, no build) → Pages funziona
**out of the box** senza config:

1. Vai su `https://github.com/francescobee/Stack-Balance/settings/pages`
2. **Source**: Deploy from a branch
3. **Branch**: `main` · folder: `/ (root)`
4. Save

Dopo ~1 minuto il sito è live a:
- 🎮 Game: `https://francescobee.github.io/Stack-Balance/`
- 🧪 Tests: `https://francescobee.github.io/Stack-Balance/tests/test.html`

URLs già linkate nel [`README.md`](README.md).

> ⚠️ Pages è pubblico. Se vuoi mantenerlo privato, GitHub richiede un
> piano paid (Pro o Enterprise).

---

## 🧪 Continuous Integration (test automatici)

Il workflow [`.github/workflows/test.yml`](.github/workflows/test.yml)
gira **`node tests/run-headless.js`** ad ogni push su `main` e ad ogni
PR. Il test runner è il modulo Node permanente in
[`tests/run-headless.js`](tests/run-headless.js) (44 test, ~150ms).

Il badge CI nel README si aggiorna automaticamente:

```markdown
[![Tests](https://github.com/francescobee/Stack-Balance/actions/workflows/test.yml/badge.svg)](https://github.com/francescobee/Stack-Balance/actions/workflows/test.yml)
```

✅ verde = tutti i test passano
❌ rosso = qualcosa è rotto, NON deployare

**Usage**:
- Locale: `node tests/run-headless.js`
- Browser: apri `tests/test.html`
- CI: automatico su push/PR

---

## 🌳 Branch strategy (suggerita)

Per progetti solo, puoi anche lavorare direttamente su `main`. Ma se
vuoi struttura:

```
main             ← stabile, sempre deployabile (Pages serve da qui)
└── feat/s9.8    ← lavoro su una session (es. playtest gauntlet)
└── fix/bug-xyz  ← bugfix isolato
└── docs/readme  ← solo doc
```

**Naming convention**:
- `feat/sX.Y-name` per feature (sessions del roadmap)
- `fix/issue-N-desc` per bug
- `docs/whatever` per documentazione
- `refactor/area` per refactor puri

**Workflow tipico**:
```bash
# Inizia una nuova session
git checkout -b feat/s9.8-playtest-gauntlet

# ... lavora, commit, commit ...

git push -u origin feat/s9.8-playtest-gauntlet

# Apri PR su GitHub → review (anche solo da te) → merge to main
# CI gira automaticamente sulla PR + sul merge
```

---

## 📝 Commit message conventions

Stile suggerito (inspired by Conventional Commits, semplificato):

```
<type>(<scope>): <short summary>

<optional longer body>
```

**Type**:
- `feat` — nuova feature
- `fix` — bugfix
- `refactor` — refactor senza cambio behavior
- `docs` — solo documentazione
- `test` — solo test
- `chore` — chores (deps, config, CI)

**Scope** (opzionale):
- `data` — js/data.js (carte, OKR, eventi)
- `rules` — js/rules.js (cost, effect, awards)
- `ai` — js/ai.js
- `render` — js/render-*.js
- `balance` — js/balance.js (numeric tuning)
- `ui` — styles/*.css

**Examples**:
```
feat(data): add 2 new sabotage cards (S9.4)
fix(rules): clamp tempo to 0 in weakenNextPicker
refactor(ai): split sabotage scoring per effect-type
docs(balance-notes): document Vision win rate measurements
chore(ci): add headless test workflow
```

---

## 🏷️ Releases & milestones

Quando completi una **Phase** intera o raggiungi un milestone significativo:

```bash
git tag -a v1.0-phase8 -m "Phases 1-8 complete (build & code quality)"
git push origin v1.0-phase8
```

Su GitHub: Releases → Draft a new release → tag → titolo + note (puoi
copiare la sezione rilevante del CHANGELOG.md).

**Suggerite milestone**:
- `v1.0-phase8` — fine fase build (✅ done, già nel codice)
- `v1.1-quick-balance` — chiusura S9.1 + S9.3 + S9.5 + S9.7 (✅ done)
- `v1.2-balance-validated` — quando S9.8 sarà finito con win rates misurati

---

## 🐛 Issues per bug tracking & playtest log

Per **S9.8 (Playtest Gauntlet)** in particolare, GitHub Issues è
ideale come log strutturato:

**Setup suggerito**:
1. Crea labels: `playtest`, `bug`, `balance`, `enhancement`, `S9.X`
2. Crea milestone `S9.8 Playtest Gauntlet`
3. Per ogni partita di playtest, apri 1 issue tipo:
   ```
   Title: [Playtest 03] Tech First @ Senior · Standard
   Labels: playtest, S9.8

   - Win? ✅
   - MAU finale: 67K
   - Award split: stat 18 / synergy 12 / Q-bonus 9
   - Friction: il modal di pitch ancora pesante anche con skip
   - Joy: 4 Tool permanents → Tech Stack gold
   ```
4. Quando 5 playtests di una Vision sono fatti, chiudi le issue e
   apri 1 issue summary con il win rate misurato.

I dati delle issue sono **citabili** in BALANCE-NOTES.md
(`#23 measured 60% win rate for Tech First`).

---

## 🤝 Working with Claude (questa AI) e GitHub

Posso:
- ✅ Modificare file locali e fare commit (con tua approvazione)
- ✅ Creare/aggiornare workflow GitHub Actions
- ✅ Scrivere PR description / release notes da CHANGELOG
- ❌ Pushare al GitHub remote (serve la tua auth)
- ❌ Creare issue / PR su GitHub UI (serve tu)
- ❌ Mergare PR (serve tu o un automation che configuri)

**Workflow tipico delle session di sviluppo**:
1. Tu: "procedi con S9.X"
2. Io: lavoro su un branch locale, commit incrementali
3. Io: ti dico "branch pronto, push tu"
4. Tu: `git push origin feat/s9.X-name` + apri PR
5. CI gira → ✅
6. Tu: merge to main → Pages aggiorna automaticamente

---

## 📦 Cosa NON committare (vedi .gitignore)

- File temporanei dei test (`tests/.headless-check.js`)
- OS junk (.DS_Store, Thumbs.db)
- Editor config (.vscode/, .idea/)
- node_modules/ (in caso futuro)
- *.log

`.gitignore` già configurato. Se aggiungi un nuovo tipo di file da
escludere, aggiungilo lì.

---

## 🔐 Secrets & sensitive data

Il progetto **non ha secret** al momento (no API keys, no env vars).
Se in futuro aggiungi backend / auth / analytics:
- **MAI** committare chiavi
- Usa GitHub Secrets per CI: Settings → Secrets and variables → Actions
- Carica via `${{ secrets.MY_KEY }}` nei workflow YAML

---

## 🎯 Quick wins per S9.8 (playtest gauntlet)

Per sfruttare GitHub al massimo nella session finale:

1. **Crea il milestone** "S9.8 Playtest Gauntlet" su GitHub
2. **Apri le 10 issue** templatate (1 per partita) usando l'etichetta
   `playtest`
3. Mentre giochi, **commenta sull'issue** con i dati raccolti
4. A fine playtest, chiudi tutte le issue e **apri 1 issue summary**
   con la decisione finale (es. "Bootstrapped buff: startingBudget
   6 → 8 — confermato win rate 28% nelle 5 partite")
5. Apri 1 PR `feat/s9.8-balance-pass` con i tweak finali
6. Merge → release `v1.2-balance-validated`

Il tutto è tracciabile e linkabile da `BALANCE-NOTES.md` con `#N`.
