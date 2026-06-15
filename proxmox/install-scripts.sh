#!/usr/bin/env bash
set -e

echo "Starting standalone Docmost LXC installation..."

# 1. Get the next available Container ID
CTID=$(pvesh get /cluster/nextid)
echo "Using CTID: $CTID"

# 2. Update templates and get Debian 12
echo "Fetching Debian 12 template..."
pveam update >/dev/null
TEMPLATE=$(pveam available -section system | grep debian-12-standard | awk '{print $2}' | head -n 1)

if [ -z "$TEMPLATE" ]; then
    echo "Error: Could not find Debian 12 template."
    exit 1
fi

echo "Downloading template $TEMPLATE to local storage..."
pveam download local "$TEMPLATE" >/dev/null || true

# 3. Create the LXC container
# NOTE: Adjust memory, cores, and storage pools here if needed
echo "Creating LXC container..."
pct create $CTID local:vztmpl/$TEMPLATE \
    -arch amd64 \
    -hostname docmost-custom \
    -cores 2 \
    -memory 4096 \
    -net0 name=eth0,bridge=vmbr0,ip=dhcp \
    -rootfs local-lvm:8 \
    -features nesting=1 \
    -unprivileged 1

# 4. Start the container and wait for network
echo "Starting container and waiting for network..."
pct start $CTID
sleep 10 

# 5. Execute installation commands INSIDE the container
echo "Installing dependencies and Docmost..."
pct exec $CTID -- bash -c "
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y curl git sudo postgresql redis-server jq build-essential openssl

    # Setup PostgreSQL Database
    echo 'Configuring Database...'
    sudo -u postgres psql -c \"CREATE DATABASE docmost;\"
    sudo -u postgres psql -c \"CREATE USER docmost WITH ENCRYPTED PASSWORD 'docmost_strong_password';\"
    sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE docmost TO docmost;\"
    sudo -u postgres psql -c \"ALTER DATABASE docmost OWNER TO docmost;\"

    # Install Node.js 22 and pnpm
    echo 'Configuring Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    npm install -g pnpm

    # Clone your custom repository
    echo 'Cloning custom Docmost repository...'
    mkdir -p /opt/docmost
    git clone https://github.com/codewithshinde/docmost.git /opt/docmost
    cd /opt/docmost

    # Generate the .env configuration file
    echo 'Setting up environment...'
    cat <<EOF > .env
DATABASE_URL=postgresql://docmost:docmost_strong_password@127.0.0.1:5432/docmost
REDIS_URL=redis://127.0.0.1:6379
PORT=3000
APP_SECRET=\$(openssl rand -hex 32)
EOF

    # Build the application
    echo 'Building application (this may take a few minutes)...'
    pnpm install
    pnpm build

    # Create a Systemd service to keep it running
    echo 'Creating background service...'
    cat <<EOF > /etc/systemd/system/docmost.service
[Unit]
Description=Docmost Service
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/docmost
EnvironmentFile=/opt/docmost/.env
ExecStart=/usr/bin/pnpm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    # Start the service
    systemctl daemon-reload
    systemctl enable --now docmost
"

# 6. Retrieve the IP and finish
IP=$(pct exec $CTID -- ip -4 addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

echo "-----------------------------------------------------------"
echo "✅ Docmost installed successfully in CTID $CTID!"
echo "🌐 Access your wiki at: http://$IP:3000"
echo "-----------------------------------------------------------"