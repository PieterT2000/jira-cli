/**
 * Converts time string to a full date time string where the current Date() is used as reference
 * @param {string} timeString format like 10am, 10:30am, 10:30, 10:30:30
 * @returns {string} date-time String
 */
export function timeToToDateTimeString(timeString) {
  let timeDateStr = "";
  if (timeString) {
    const timeRegex =
      /^(\d{1,2})[:. ]?(\d{0,2})[:. ]?(\d{0,2})[:. ]?([ap]?\.?m\.?)?/gi;
    const [, h, m, s, period] = timeRegex.exec(timeString);

    const timeMarkerRegex = /^([ap]{1})\.?m?\.?/gi;
    let timeMarker = null;
    if (period) [, timeMarker] = timeMarkerRegex.exec(period);

    const date = new Date();
    let periodAdjustedHour = parseInt(h);
    /**
     * Conventions:
     * - 12 p.m. -> noon
     * - 12 a.m. -> noon
     */
    if (timeMarker === "p" && h < 12) periodAdjustedHour += 12;
    else if (timeMarker === "a" && h === 12) periodAdjustedHour = 0;
    date.setHours(periodAdjustedHour, m, s, 0);
    timeDateStr = date.toString();
  }
  return timeDateStr;
}

/**
 * Converts time string to seconds
 * @param {string} timeString expects time in xx:xx format or x(x)h x(x)m x(x)s
 * @returns {Number} time in seconds
 */
export function timeStringToSeconds(timeString) {
  let seconds = 0;
  if (!timeString) return seconds;

  // In case passed timestring is passed without units as single value, we interpret it as seconds
  if (!isNaN(+timeString)) return +timeString;

  if (timeString.includes(":")) {
    // format is xx:xx
    const timeRegex = /^(\d{0,2})[:. ]?(\d{0,2})[:. ]?(\d{0,2})/g;
    const [, h, m, s] = timeRegex.exec(timeString);
    seconds =
      parseInt(h || 0) * 3600 + parseInt(m || 0) * 60 + parseInt(s || 0);
  } else {
    // format is (xxh) (xxm) (xxs)
    const timeRegex = /^(\d{1,2}h)? ?(\d{1,2}m)? ?(\d{1,2}s)?/g;
    const [, param1, param2, param3] = timeRegex.exec(timeString);
    const removeTimeUnit = (i) => parseInt(i.slice(0, -1));
    const defaultToZero = (i) => (i === undefined ? `0x` : i);
    const [h, m, s] = [param1, param2, param3]
      .map(defaultToZero)
      .map(removeTimeUnit);
    seconds = h * 3600 + m * 60 + s;
  }

  return seconds;
}
