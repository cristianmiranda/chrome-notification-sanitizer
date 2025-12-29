#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MANIFEST="$ROOT_DIR/manifest.json"

usage() {
    echo "Usage: $0 <major|minor|patch>"
    echo ""
    echo "Bumps the version in manifest.json, commits, tags, and pushes."
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

BUMP_TYPE="$1"

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "Error: Invalid bump type '$BUMP_TYPE'"
    usage
fi

# Get current version
CURRENT_VERSION=$(jq -r '.version' "$MANIFEST")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Calculate new version
case "$BUMP_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "Bumping version: $CURRENT_VERSION -> $NEW_VERSION"

# Update manifest.json
jq --arg v "$NEW_VERSION" '.version = $v' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

# Git operations
cd "$ROOT_DIR"
git add manifest.json
git commit -m "Bump version to $NEW_VERSION"
git tag "v$NEW_VERSION"
git push
git push origin "v$NEW_VERSION"

echo ""
echo "Version $NEW_VERSION released!"
echo "GitHub Actions will create the release at:"
echo "https://github.com/cristianmiranda/chrome-notification-sanitizer/releases/tag/v$NEW_VERSION"
