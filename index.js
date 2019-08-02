/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2019 */

const SHOW_BUG_PREFIX = "https://bugzilla.mozilla.org/show_bug.cgi?id=";
const WEEKS_PER_RELEASE = 7;

/**
 * The list of release. Generally you don't need to add an entry here as long as releases are
 * happening every 7 weeks. If there is a change or a delay, add that release here and the schedule
 * will magically work again.
 */
const RELEASES = [
  { version: 67, date: "2019-05-21" },
  { version: 69, date: "2019-09-03" },
];

/**
 * Convert a version number to a release date.
 *
 * @param {number} version    The version number to check.
 * @return {Date}             The date of the release.
 */
function releaseDate(version) {
  let release;
  for (let i = RELEASES.length - 1; i >= 0; i--) {
    release = RELEASES[i];

    if (version >= release.version) {
      break;
    }
  }

  if (version < release.version) {
    return null;
  }

  let releasesBetween = version - release.version;
  let daysBetween = releasesBetween * WEEKS_PER_RELEASE * 7;

  let target = new Date(release.date);
  target.setDate(target.getDate() + daysBetween);

  return target;
}

/**
 * Convert a quarter number to a date, taking into account the current time of year. If it is
 * currently Q2 and you pass in `1` for Q1, then it will return January of the next year.
 *
 * @param {number} quarter      The quarter to convert.
 * @return {Date}               The date for the quarter.
 */
function quarterToDate(quarter) {
  let now = new Date();
  let quarterDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1, 12, 0, 0);

  if (quarterDate < now) {
    quarterDate.setFullYear(now.getFullYear() + 1);
  }
  return quarterDate;
}

/**
 * Add a number of days to a date. Can be negative.
 *
 * @param {Date} date           The date to add to.
 * @param {number} days         The number of days to add.
 * @return {Date}               The modified date.
 */
function addDays(date, days) {
  let target = new Date(date);
  target.setDate(target.getDate() + days);
  return target;
}

/**
 * Format a date for output. Includes the date and quarter.
 *
 * @param {Date} date           The date to format.
 * @return {string}             The formatted date.
 */
function formatDate(date) {
  let datestr = new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  let quarter = Math.floor((date.getMonth() / 3)) + 1;
  return `${datestr} (Q${quarter})`;
}

/**
 * Create a detail badge for the specific version. Fills in items for each milestone and links them
 * to Google Calendar. If no known release date exists it will return null.
 *
 * @param {number?} version     The version to create the badge for.
 * @return {Object}             The Trello detail badge.
 */
function createDetailBadge(version) {
  let release = releaseDate(version);
  if (!release) {
    return null;
  }

  let beta = addDays(releaseDate(version - 1), -1);
  let nightly = addDays(releaseDate(version - 2), -1);

  return {
    title: "Firefox " + version,
    version: version,
    text: formatDate(release),
    callback: function(t, opts) {
      let items = [
        { name: "Release", date: release },
        { name: "Beta", date: beta },
        { name: "Soft freeze", date: addDays(beta, -7) },
        { name: "Sign-offs due", date: addDays(nightly, 7) },
        { name: "Nightly begins", date: nightly },
        { name: "Eng. kick-off", date: addDays(nightly, -3) },
        { name: "UX/copy due", date: addDays(nightly, -10) },
        { name: "Draft PRDs due", date: addDays(nightly, -20) },
      ];

      t.closePopup();
      return t.popup({
        title: `Firefox ${version} Release Schedule`,
        items: items.map(({ name, date }) => {
          return {
            text: `${name}: ${formatDate(date)}`,
            url: `https://calendar.google.com/calendar/r/week/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
            color: "green"
          };
        })
      });
    }
  };
}

/**
 * Begin trello powerup initialization.
 */
TrelloPowerUp.initialize({
  /**
   * Attachment section that shows bug information including status.
   *
   * @param {Object} t      Trello object.
   * @param {Object} opts   Trello options.
   * @return {Object[]}     Trello attachment sections.
   */
  "attachment-sections": function(t, opts) {
    let claimed = opts.entries.filter(attachment => attachment.url.startsWith(SHOW_BUG_PREFIX));
    if (!claimed.length) {
      return [];
    }

    return [{
      title: "Bug Attachments",
      claimed: claimed,
      icon: TrelloPowerUp.util.relativeUrl("./images/bug-item.png"),
      content: {
        type: "iframe",
        url: t.signUrl("./frames/bugzilla.html"),
        height: 50
      }
    }];
  },

  /**
   * A list sorter that allows to sort by date, resolving the labels for Firefox
   * versions (i.e. FF70) and quarters (i.e. Q3).
   *
   * @param {Object} t      Trello object.
   * @return {Object[]}     Trello sorters.
   */
  "list-sorters": function(t) {
    return [{
      text: "Firefox Version and Quarter",
      callback: function(t, opts) {
        function minDate(card) {
          let minimum = Infinity;

          for (let label of card.labels) {
            let match = label.name.match(/^Q([1234])$/);
            if (match) {
              let date = quarterToDate(parseInt(match[1], 10));
              minimum = minimum < date ? minimum : date;
            }

            match = label.name.match(/^FF(\d+)$/);
            if (match) {
              let date = releaseDate(parseInt(match[1], 10));
              minimum = minimum < date ? minimum : date;
            }
          }
          return minimum === Infinity ? null : minimum;
        }

        let sortedIds = opts.cards.sort((a, b) => {
          let datea = minDate(a);
          let dateb = minDate(b);
          return (datea > dateb) - (dateb > datea);
        }).map(card => card.id);

        return { sortedIds };
      }
    }];
  },

  /**
   * An URL formatter that formats bugzilla links to bug numbers.
   *
   * @param {Object} t      Trello object.
   * @param {Object} opts   Trello options.
   * @return {Object}       Trello formatters.
   */
  "format-url": function(t, opts) {
    if (opts.url.startsWith(SHOW_BUG_PREFIX)) {
      return {
        text: "bug " + opts.url.substr(45),
        icon: TrelloPowerUp.util.relativeUrl("./images/bug-item.png")
      };
    }

    return t.notHandled();
  },

  /**
   * Card detail badges that show dates for the Firefox milestones set via labels, i.e FF70.
   *
   * @param {Object} t              Trello object.
   * @param {Object} opts           Trello options.
   * @return {Promise<Object[]>}    Trello badges.
   */
  "card-detail-badges": function(t, opts) {
    return t.card("labels")
      .get("labels")
      .then((labels) => {
        let badges = [];

        for (let label of labels) {
          let match = label.name.match(/^FF(\d+)$/);
          if (match) {
            let version = parseInt(match[1], 10);
            let badge = createDetailBadge(version);
            if (badge) {
              badges.push(badge);
            }
          }
        }
        badges.sort((a, b) => (a.version > b.version) - (b.version > a.version));
        console.log(badges);
        return badges;
      });
  }
}, { appName: "AMO Trello Companion" });
