/**
 * Сборщик проекта
 *
 * @copyright 2017 (с) Arcsinus. All rights reserved
 * @author Sergey Belevskiy <belevskiy@arcsinus.ru>, 19.07.17
 */
"use strict";

import gulp from "gulp";
import moment from "moment";
import color from "cli-color";
import server from "gulp-develop-server";
import watch from "gulp-watch";

// Небольшой начальный конфиг
const config = {
  localDevelopmentEnvironment: "development",
  applicationExecutablePath: "./src/index.js",
  serverWatchPaths: ["./**/*.js", "./config/**/*.json"]
};

process.env.NODE_ENV = config.localDevelopmentEnvironment;

gulp.task("default", function() {
  process.env.NODE_ENV = config.localDevelopmentEnvironment;
  startServer()
    .then(() => {
      console.log(nowtime(), color.blue("Инициализирован запуск сервера"));
      return Promise.resolve();
    })
    .then(() => {
      return serverWatcher();
    })
    .catch(err => {
      console.log(
        nowtime(),
        color.red("Ошибка в работе таска default:\n"),
        err
      );
    });
});

function startServer() {
  return new Promise((resolve, reject) => {
    server.listen(
      {
        path: config.applicationExecutablePath,
        env: {
          NODE_ENV: config.localDevelopmentEnvironment
        }
      },
      err => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}
function nowtime() {
  return `[${color.blackBright(
    moment().format("DD.MM.YY - H:mm:ss.SS")
  )}] ${color.cyan(__filename.replace(process.cwd() + "/", ""))} `;
}
function eventInformer(vinyl, infostring) {
  if (vinyl.event === "change") {
    console.log(nowtime(), color.yellow(`-- ${infostring} файлы изменились`));
  }
  if (vinyl.event === "add") {
    console.log(nowtime(), color.green(`-- ${infostring} файлы добавлены`));
  }
  if (vinyl.event === "unlink") {
    console.log(nowtime(), color.red(`-- ${infostring} файлы удалены`));
  }
}

function serverWatcher() {
  return new Promise((resolve, reject) => {
    watch(config.serverWatchPaths, vinyl => {
      eventInformer(vinyl, "Серверный код: ");
      server.restart(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}
