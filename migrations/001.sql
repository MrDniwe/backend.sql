create table clients (
    id character(255) primary key,
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create table stores (
    uuid uuid primary key,
    client_id character varying(255), references clients (id) on delete cascade,
    title character varying(255),
    address character varying(255),
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create table employees (
    uuid uuid primary key,
    client_id character varying(255), references clients (id) on delete cascade,
    first_name character varying(255),
    middle_name character varying(255),
    last_name character varying(255),
    phone bigint,
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create table commodities (
    uuid uuid primary key,
    store_uuid uuid references stores (uuid) on delete cascade,
    title character varying(255),
    description character varying(255),
    cost numeric(10,2),
    price numeric(10,2),
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create table store_employees (
    primary key (store_uuid, employee_uuid),
    store_uuid uuid references stores (uuid) on delete cascade,
    employee_uuid uuid references employees (uuid) on delete cascade,
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create table devices (
    uuid uuid primary key,
    store_uuid uuid references stores (uuid) on delete cascade,
    title character varying(255),
    timezone_offset interval,
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create type doctype as enum ('session', 'sell', 'fprint');
create type sessiontype as enum ('open', 'close');
create table loaded_days (
    uuid uuid unique not null,
    primary key (store_uuid, loaded_day, document_type),
    store_uuid uuid not null references stores (uuid) on delete cascade,
    loaded_day date not null,
    document_type doctype not null,
    is_temporary boolean default false,
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
create table sessions (
    uuid uuid primary key,
    loaded_day_uuid uuid not null references loaded_days (uuid) on delete cascade,
    session_uuid uuid not null,
    device_uuid uuid references devices (uuid) on delete cascade,
    employee_uuid uuid references employees (uuid) on delete cascade,
    session_type sessiontype not null,
    datetime timestamp with time zone not null,
    created timestamp with time zone default current_timestamp,
    updated timestamp with time zone default current_timestamp
);
