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

CONFIG_PROJECT="$(node -e "const c=require('./public/firebase-config.js'); console.log(c.projectId || '')" 2>/dev/null || true)"
if [ -n "$CONFIG_PROJECT" ] && [ "$CONFIG_PROJECT" != "$PROJECT_ID" ]; then
  echo "Firebase config project mismatch: expected $PROJECT_ID, got $CONFIG_PROJECT"
  exit 1
fi

node scripts/validate.js
node --test tests/*.test.js

echo "Deploying only Firebase Hosting and Realtime Database rules to $PROJECT_ID."
firebase deploy --project "$PROJECT_ID" --only database,hosting
