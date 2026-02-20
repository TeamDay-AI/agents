#!/bin/bash
# Optimize PNG avatar to WebP
# Usage: ./optimize-avatar.sh filename.png

if [ -z "$1" ]; then
  echo "Usage: ./optimize-avatar.sh filename.png"
  exit 1
fi

PNG_FILE="$1"
WEBP_FILE="${PNG_FILE%.png}.webp"
DIR="packages/marketing/public/authors"

if [ ! -f "$DIR/$PNG_FILE" ]; then
  echo "Error: $DIR/$PNG_FILE not found"
  exit 1
fi

echo "Converting $PNG_FILE to WebP..."
cwebp -q 85 "$DIR/$PNG_FILE" -o "$DIR/$WEBP_FILE"

echo ""
echo "Size comparison:"
ls -lh "$DIR/$PNG_FILE" "$DIR/$WEBP_FILE" | awk '{print $5, $9}'

echo ""
echo "To remove the PNG file:"
echo "  rm $DIR/$PNG_FILE"
