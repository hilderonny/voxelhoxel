# Voxelhoxel
This is a small casual voxel game located at https://www.voxelhoxel.de.

![Screenshots](presentation.jpg)
*This awesome screenshot was made with https://pixeden.com and https://photopea.com*

## Installation on own server

To run this game on your own server, you need to setup a NodeJS / MongoDB environment. On my server I use a combination of the following parts (as of January 2019):
- Ubuntu 18.04
- Apache 2
- NodeJS 11.6.0
- MongoDB 4.0.5

The installation of the server operating system and Apache 2 will not be described here because it was provided by my VPS hoster https://keyweb.de. The only pitfall can be that this software configuration needs an x64 system. On older i386 systems the needed software packages are not available.

### Install NodeJS

As described at https://github.com/nodesource/distributions/blob/master/README.md the installation was done in this way:

```sh
curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -

sudo apt-get install -y nodejs
```

### Install MongoDB

The installation of MongoDB is described in detail at https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/.

```sh
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4

echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list

sudo apt-get update

sudo apt-get install -y mongodb-org

sudo service mongod start
```

### Download and install Voxelhoxel

Download the sources and install needed packages.

```sh
mkdir -p /github/hilderonny
cd /github/hilderonny
git pull https://github.com/hilderonny/voxelhoxel.git
cd /github/hilderonny/voxelhoxel
npm install
```

Now setup a service to run the server in the background. To do this, create a file `/etc/systemd/system/voxelhoxel.de.service` with the following content.

```
[Install]
WantedBy=multi-user.target

[Unit]
Description=voxelhoxel.de
[Service]
Environment=PORT=62000
ExecStart=/usr/bin/node /github/hilderonny/voxelhoxel/server/index.js
WorkingDirectory=/github/hilderonny/voxelhoxel
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=voxelhoxel.de
```

Now start the service with

```
systemctl enable voxelhoxel.de
systemctl start voxelhoxel.de
```

The game can now be reached at port `62000` of your server.

### Configure Apache as proxy for a custom domain

In this step we configure Apache to proxy our custom domain `voxelhoxel.de` to the service on the port `62000` so that the game can be reached by https://voxelhoxel.de.

First you need to configure your domain provider to point your domain to the IP address of your server. Next, create an apache site in `/etc/apache2/sites-available/voxelhoxel.de.conf` with the following content.

```
<VirtualHost *:80>
  ServerName www.voxelhoxel.de
  ServerAlias voxelhoxel.de
  RewriteEngine On
  RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
  ServerName www.voxelhoxel.de
  ServerAlias voxelhoxel.de
  ProxyPreserveHost On
  ProxyPass / http://127.0.0.1:62000/
  ProxyPassReverse / http://127.0.0.1:62000/
  LogLevel error
  ErrorLog /var/log/voxelhoxel.de.log
</VirtualHost>
```

Now enable the site and reload Apache.

```sh
a2ensite voxelhoxel.de
service apache2 reload
```

### Configure SSL certificate for secure connections

To have a really good user experience you should install an SSL certificate. On my server I did it with [Letsencrypt (now certbot)](https://github.com/letsencrypt/letsencrypt).

```sh
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install python-certbot-apache 

sudo certbot --apache
```

The last command starts a wizard which guides you through the process of generating a certificate and automatically configuring your Apache configurations to use this certificate. After a final `service apache2 reload` your Voxelhoxel game will be available under you domain via SSL!

Happy playing!