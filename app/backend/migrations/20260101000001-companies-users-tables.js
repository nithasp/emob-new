'use strict';

const fs = require('fs');
const path = require('path');

const readSql = (direction) =>
  fs.promises.readFile(path.join(__dirname, 'sqls', '20260101000001-companies-users-tables-' + direction + '.sql'), 'utf8');

exports.setup = function () {};

exports.up = function (db) {
  return readSql('up').then((sql) => db.runSql(sql));
};

exports.down = function (db) {
  return readSql('down').then((sql) => db.runSql(sql));
};

exports._meta = { version: 1 };
