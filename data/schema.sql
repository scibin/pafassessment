drop database if exists music;

create database music;

use music;

create table users (
	user_id varchar(8) not null,
	username varchar(32) not null,
	primary key (user_id)
);

insert into users(user_id, username) values
	('4d0cae84', 'fred'),
	('26a85b1c', 'barney'),
	('675cee52', 'betty'),
	('27b965f6', 'wilma'),
	('820e8a4d', 'bambam'),
	('fc42a34d', 'pebbles');
