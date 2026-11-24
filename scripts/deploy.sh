#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="taxiconnect-dev"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Firebase CLI is required. Install it with: npm install -g firebase-tools"
  exit 1
fi

if ! firebase projects:list >/dev/null 2>&1; then
  echo "Firebase CLI is not authenticated. Run: firebase login"
  exit 1
fi

if grep -q "REPLACE_WITH" public/firebase-config.js; then
  echo "Firebase Web App configuration is incomplete."
  echo "Update public/firebase-config.js from Firebase Console before deployment."
  exit 1
fi

CONFIG_PROJECT="$(sed -n 's/^[[:space:]]*projectId: "\([^"]*\)".*/\1/p' public/firebase-config.js | head -n 1)"
if [ -n "$CONFIG_PROJECT" ] && [ "$CONFIG_PROJECT" != "$PROJECT_ID" ]; then
  echo "Firebase config project mismatch: expected $PROJECT_ID, got $CONFIG_PROJECT"
  exit 1
fi

(cd functions && npm ci && npm install --no-save --no-package-lock @firebase/rules-unit-testing firebase)
node scripts/validate.js
node --test tests/*.test.js
firebase emulators:exec --project "$PROJECT_ID" --only database "node scripts/test-database-rules.js"

echo "Deploying only Firebase Hosting and Realtime Database rules to $PROJECT_ID."
firebase deploy --project "$PROJECT_ID" --only database,hosting
