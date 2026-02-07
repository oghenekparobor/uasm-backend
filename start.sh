#!/bin/sh
# Run migrate + seed in background; start server in foreground so health check passes quickly
(npx prisma migrate deploy && node dist/prisma/seed.js) &
exec node dist/src/main
