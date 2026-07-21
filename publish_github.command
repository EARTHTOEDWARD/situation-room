#!/usr/bin/env bash
cd "$(dirname "$0")"
./publish_github.sh
STATUS=$?
echo
if [[ $STATUS -eq 0 ]]; then
  echo "Done. Press Return to close this window."
else
  echo "Publishing stopped with an error. Press Return to close this window."
fi
read -r
exit $STATUS
