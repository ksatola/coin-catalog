


## Testy
cd /workspaces/coin-catalog/backend
uv run pytest -q

cd /workspaces/coin-catalog/frontend
npm run type-check
npm run test:ui

cd /workspaces/coin-catalog/frontend
npm run test:ui -- tests/ui/coin-grid-refresh.spec.ts -g "powrót z widoku szczegółowego"


## Testy E2E z katalogu frontendu
cd /workspaces/coin-catalog/frontend
npm ci
npx playwright test tests/ui/story.spec.ts


# Wygenerowanie lockfile w Twoim kontenerze
cd /workspaces/coin-catalog/frontend
npm install --package-lock-only
