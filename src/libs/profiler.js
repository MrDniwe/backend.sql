module.exports = class EasyProfiler {
  constructor(isShown = true, name = "default") {
    this.points = [new Date().getTime()];
    this.name = name;
    this.isShown = isShown;
  }
  check(message) {
    this.points.push(new Date().getTime());
    if (this.isShown)
      console.log(
        `-- ${this.name} profile point #${this.points.length - 1}${message
          ? ' "' + message + '" '
          : ""} [${this.points[this.points.length - 1] -
          this.points[this.points.length - 2]}]ms\n`
      );
  }
};
