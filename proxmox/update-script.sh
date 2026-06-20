#!/usr/bin/env bash
set -e

# 1. Require CTID as an argument
if [ -z "$1" ]; then
    echo "Error: Missing Container ID."
    echo "Usage: ./upgrade-docmost.sh <CTID>"
    exit 1
fi

CTID=$1

# 2. Verify container exists and is running
if ! pct status "$CTID" >/dev/null 2>&1; then
    echo "Error: Container $CTID does not exist on this Proxmox node."
    exit 1
fi

STATUS=$(pct status "$CTID" | awk '{print $2}')
if [ "$STATUS" != "running" ]; then
    echo "Container $CTID is stopped. Starting it now..."
    pct start "$CTID"
    sleep 5
fi

echo "Starting upgrade for Docmost in CTID $CTID..."

# 3. Execute upgrade commands INSIDE the container
pct exec "$CTID" -- bash -c "
    set -e

    echo 'Stopping the Docmost service...'
    systemctl stop docmost

    echo 'Creating a backup of the PostgreSQL database...'
    # Saves a timestamped dump to /opt/ just in case the upgrade introduces breaking schema changes
    sudo -u postgres pg_dump docmost > /opt/docmost_db_backup_\$(date +%F_%H-%M-%S).sql

    echo 'Pulling latest code from the repository...'
    cd /opt/docmost
    
    # Stash any local uncommitted changes to prevent merge conflicts
    git stash >/dev/null || true 
    git pull origin main

    echo 'Updating Node.js dependencies via pnpm...'
    pnpm install

    echo 'Rebuilding the application...'
    pnpm build

    # NOTE: If your custom fork requires a specific database migration command 
    # after pulling new code (e.g., Prisma or TypeORM migrations), add it here:
    # pnpm run db:migrate 

    echo 'Starting the Docmost service...'
    systemctl start docmost

    # Wait a moment for the service to spin up and check its status
    sleep 3
    if systemctl is-active --quiet docmost; then
        echo 'Service is active and running.'
    else
        echo '⚠️ Warning: Service failed to start. Check logs using: pct exec $CTID -- journalctl -u docmost -n 50'
    fi
"

echo "-----------------------------------------------------------"
echo "✅ Docmost upgraded successfully in CTID $CTID!"
echo "-----------------------------------------------------------"