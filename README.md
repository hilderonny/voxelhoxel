# Voxelhoxel

## Datenbank erstellen

```sql
create database www_voxelhoxel_de default character set utf8 default collate utf8_bin;
GRANT ALL PRIVILEGES ON www_voxelhoxel_de.* to voxelhoxel@'localhost' IDENTIFIED BY 'voxelhoxel';
use www_voxelhoxel_de;
create table modelinfos (id int(11) auto_increment primary key, modelid int(11) not null, name varchar(255), lastmodified bigint(20), published tinyint(1));
create table models (id int(11) auto_increment primary key, data longtext);
```